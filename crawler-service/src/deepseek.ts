import { AnalysisRequest, AnalysisResponse, QuestionResult, SourceInfo } from './types';

const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

export class DeepSeekAnalyzer {
  async analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
    const { platform, brandName, questions } = request;

    if (!DEEPSEEK_API_KEY) {
      throw new Error('DeepSeek API Key not configured');
    }

    // 构建分析提示
    const prompt = this.buildAnalysisPrompt(brandName, questions);

    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的GEO（生成式引擎优化）分析师，擅长分析AI搜索结果中的品牌提及情况。请根据提供的问答数据，分析品牌可见度、提及率、正面/负面评价比例等指标。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const analysis = data.choices?.[0]?.message?.content || '';

      // 解析分析结果
      return this.parseAnalysisResult(platform, brandName, questions, analysis);
    } catch (error) {
      console.error('DeepSeek analysis error:', error);
      // 返回基于规则的分析结果
      return this.ruleBasedAnalysis(platform, brandName, questions);
    }
  }

  private buildAnalysisPrompt(brandName: string, questions: { question: string; answer: string; mentions: { brand: string; mentioned: boolean; context: string }[] }[]): string {
    const brands = brandName.split(',').map(b => b.trim()).filter(b => b);

    let prompt = `请分析以下AI搜索问答数据，评估品牌"${brands.join('、')}"的GEO表现：\n\n`;

    // 正面问题
    const positiveQuestions = questions.filter((_, i) => i < 10);
    prompt += '【正面问题】\n';
    positiveQuestions.forEach((q, i) => {
      prompt += `${i + 1}. 问题：${q.question}\n`;
      prompt += `   回答：${q.answer.substring(0, 300)}...\n`;
      const mentioned = q.mentions.filter(m => m.mentioned).map(m => m.brand).join('、');
      prompt += `   提及品牌：${mentioned || '无'}\n\n`;
    });

    // 反面问题
    const negativeQuestions = questions.filter((_, i) => i >= 10);
    prompt += '【反面问题】\n';
    negativeQuestions.forEach((q, i) => {
      prompt += `${i + 1}. 问题：${q.question}\n`;
      prompt += `   回答：${q.answer.substring(0, 300)}...\n`;
      const mentioned = q.mentions.filter(m => m.mentioned).map(m => m.brand).join('、');
      prompt += `   提及品牌：${mentioned || '无'}\n\n`;
    });

    prompt += `\n请提供以下分析结果（JSON格式）：\n`;
    prompt += `{\n`;
    prompt += `  "overallScore": 0-100的综合得分,\n`;
    prompt += `  "visibilityScore": 0-100的可见度得分,\n`;
    prompt += `  "mentionRate": 提及率百分比,\n`;
    prompt += `  "positiveRate": 正面提及率百分比,\n`;
    prompt += `  "negativeRate": 反面提及率百分比,\n`;
    prompt += `  "analysis": "详细的分析总结"\n`;
    prompt += `}\n`;

    return prompt;
  }

  private parseAnalysisResult(
    platform: string,
    brandName: string,
    questions: { question: string; answer: string; mentions: { brand: string; mentioned: boolean; context: string }[] }[],
    analysis: string
  ): AnalysisResponse {
    // 尝试从分析文本中提取JSON
    let scores = {
      overallScore: 70,
      visibilityScore: 75,
      mentionRate: 60,
      positiveRate: 70,
      negativeRate: 30,
    };

    try {
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        scores = {
          overallScore: parsed.overallScore || 70,
          visibilityScore: parsed.visibilityScore || 75,
          mentionRate: parsed.mentionRate || 60,
          positiveRate: parsed.positiveRate || 70,
          negativeRate: parsed.negativeRate || 30,
        };
      }
    } catch {
      // 使用默认值
    }

    // 构建问题结果
    const positiveQuestions: QuestionResult[] = questions.slice(0, 10).map(q => {
      const mentioned = q.mentions.some(m => m.mentioned);
      const brands = q.mentions.filter(m => m.mentioned).map(m => m.brand).join(',');
      return {
        question: q.question,
        isMentioned: mentioned,
        mentionedBrands: brands || '-',
        context: q.mentions.find(m => m.mentioned)?.context || '',
      };
    });

    const negativeQuestions: QuestionResult[] = questions.slice(10).map(q => {
      const mentioned = q.mentions.some(m => m.mentioned);
      const brands = q.mentions.filter(m => m.mentioned).map(m => m.brand).join(',');
      return {
        question: q.question,
        isMentioned: mentioned,
        mentionedBrands: brands || '-',
        context: q.mentions.find(m => m.mentioned)?.context || '',
      };
    });

    // 提取来源
    const allSources: Record<string, number> = {};
    questions.forEach(q => {
      const sources = this.extractSourcesFromAnswer(q.answer);
      sources.forEach(s => {
        allSources[s] = (allSources[s] || 0) + 1;
      });
    });

    const topSources: SourceInfo[] = Object.entries(allSources)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
        url: '',
        snippet: `被引用 ${count} 次`,
      }));

    return {
      platform,
      ...scores,
      positiveQuestions,
      negativeQuestions,
      topSources,
      analysis,
    };
  }

  private ruleBasedAnalysis(
    platform: string,
    brandName: string,
    questions: { question: string; answer: string; mentions: { brand: string; mentioned: boolean; context: string }[] }[]
  ): AnalysisResponse {
    // 基于规则的分析
    const positiveQuestions = questions.slice(0, 10);
    const negativeQuestions = questions.slice(10);

    const positiveMentioned = positiveQuestions.filter(q =>
      q.mentions.some(m => m.mentioned)
    ).length;
    const negativeMentioned = negativeQuestions.filter(q =>
      q.mentions.some(m => m.mentioned)
    ).length;

    const totalQuestions = questions.length;
    const totalMentioned = positiveMentioned + negativeMentioned;

    const mentionRate = totalQuestions > 0 ? Math.round((totalMentioned / totalQuestions) * 100) : 0;
    const positiveRate = positiveQuestions.length > 0 ? Math.round((positiveMentioned / positiveQuestions.length) * 100) : 0;
    const negativeRate = negativeQuestions.length > 0 ? Math.round((negativeMentioned / negativeQuestions.length) * 100) : 0;

    const overallScore = Math.round(mentionRate * 0.6 + (positiveRate - negativeRate * 0.5) * 0.4);
    const visibilityScore = Math.round(mentionRate * 0.8 + 20);

    return {
      platform,
      overallScore: Math.min(100, Math.max(0, overallScore)),
      visibilityScore: Math.min(100, Math.max(0, visibilityScore)),
      mentionRate,
      positiveRate,
      negativeRate,
      positiveQuestions: positiveQuestions.map(q => ({
        question: q.question,
        isMentioned: q.mentions.some(m => m.mentioned),
        mentionedBrands: q.mentions.filter(m => m.mentioned).map(m => m.brand).join(',') || '-',
        context: q.mentions.find(m => m.mentioned)?.context || '',
      })),
      negativeQuestions: negativeQuestions.map(q => ({
        question: q.question,
        isMentioned: q.mentions.some(m => m.mentioned),
        mentionedBrands: q.mentions.filter(m => m.mentioned).map(m => m.brand).join(',') || '-',
        context: q.mentions.find(m => m.mentioned)?.context || '',
      })),
      topSources: [],
      analysis: `基于规则的分析：品牌在${totalMentioned}/${totalQuestions}个问题中被提及，提及率${mentionRate}%。正面提及率${positiveRate}%，反面提及率${negativeRate}%。`,
    };
  }

  private extractSourcesFromAnswer(answer: string): string[] {
    const sources: string[] = [];
    const patterns = [
      { name: '知乎', pattern: /知乎/ },
      { name: '百度知道', pattern: /百度知道/ },
      { name: '小红书', pattern: /小红书/ },
      { name: '今日头条', pattern: /今日头条/ },
      { name: '抖音', pattern: /抖音/ },
      { name: '微博', pattern: /微博/ },
      { name: 'B站', pattern: /B站|bilibili/ },
    ];

    for (const { name, pattern } of patterns) {
      if (pattern.test(answer)) {
        sources.push(name);
      }
    }

    return sources;
  }
}
