import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AICrawler } from './crawler';
import { DeepSeekAnalyzer } from './deepseek';
import { HealthChecker } from './health-check';
import { Scheduler } from './scheduler';
import { CrawlRequest, AnalysisRequest } from './types';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 初始化服务
const crawler = new AICrawler();
const analyzer = new DeepSeekAnalyzer();
const healthChecker = new HealthChecker();
const scheduler = new Scheduler();

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 平台健康检查 - 检测网页结构是否变化
app.get('/health/platforms', async (req, res) => {
  try {
    const results = await healthChecker.checkAllPlatforms();
    res.json({
      status: 'completed',
      results,
      failed: healthChecker.getFailedPlatforms(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Health Check Error]', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 检查单个平台
app.get('/health/platform/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const result = await healthChecker.checkPlatform(platform);
    res.json({
      platform,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Health Check Error]', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 爬取单个平台
app.post('/crawl', async (req, res) => {
  try {
    const request: CrawlRequest = req.body;
    
    if (!request.platform || !request.question) {
      return res.status(400).json({ error: 'Missing required fields: platform, question' });
    }

    console.log(`[Crawl] Platform: ${request.platform}, Question: ${request.question}`);
    
    const result = await crawler.crawlPlatform(request);
    res.json(result);
  } catch (error) {
    console.error('[Crawl Error]', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// 批量爬取多个平台
app.post('/crawl/batch', async (req, res) => {
  try {
    const requests: CrawlRequest[] = req.body;
    
    if (!Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({ error: 'Request body must be an array of crawl requests' });
    }

    console.log(`[Batch Crawl] ${requests.length} platforms`);
    
    const results = await Promise.all(
      requests.map(req => crawler.crawlPlatform(req))
    );
    
    res.json(results);
  } catch (error) {
    console.error('[Batch Crawl Error]', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// 分析结果
app.post('/analyze', async (req, res) => {
  try {
    const request: AnalysisRequest = req.body;
    
    if (!request.platform || !request.brandName || !request.questions) {
      return res.status(400).json({ 
        error: 'Missing required fields: platform, brandName, questions' 
      });
    }

    console.log(`[Analyze] Platform: ${request.platform}, Brand: ${request.brandName}`);
    
    const result = await analyzer.analyze(request);
    res.json(result);
  } catch (error) {
    console.error('[Analyze Error]', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// 完整诊断流程：爬取 + 分析
app.post('/diagnose', async (req, res) => {
  try {
    const { platform, brandName, industryWord, questions } = req.body;
    
    if (!platform || !brandName || !industryWord || !Array.isArray(questions)) {
      return res.status(400).json({ 
        error: 'Missing required fields: platform, brandName, industryWord, questions' 
      });
    }

    console.log(`[Diagnose] Platform: ${platform}, Brand: ${brandName}, Industry: ${industryWord}`);
    
    // 1. 爬取所有问题
    const crawlRequests: CrawlRequest[] = questions.map((q: string) => ({
      platform,
      question: q.replace(/\{name\}/g, industryWord),
      brandName,
    }));

    const crawlResults = await Promise.all(
      crawlRequests.map(req => crawler.crawlPlatform(req))
    );

    // 2. 分析结果
    const analysisRequest: AnalysisRequest = {
      platform,
      brandName,
      questions: crawlResults.map(r => ({
        platform: r.platform,
        question: r.question,
        answer: r.answer,
        mentions: r.mentions,
        sources: r.sources,
      })),
    };

    const analysisResult = await analyzer.analyze(analysisRequest);
    
    res.json({
      crawlResults,
      analysis: analysisResult,
    });
  } catch (error) {
    console.error('[Diagnose Error]', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// 手动触发定时任务
app.post('/scheduler/trigger', async (req, res) => {
  try {
    await scheduler.triggerManualCheck();
    res.json({ status: 'ok', message: 'Health check triggered manually' });
  } catch (error) {
    console.error('[Trigger Error]', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 启动服务
async function start() {
  try {
     // 先启动 HTTP 服务，确保健康检查可用
    app.listen(port, () => {
      console.log(`[Server] Running on port ${port}`);
    });

    // 延迟初始化浏览器（避免启动时阻塞）
    setTimeout(async () => {
      try {
        await crawler.init();
        console.log('[Browser] Initialized');

        // 启动定时任务
        scheduler.start();
        console.log('[Scheduler] Weekly health check scheduled for Monday 02:00 CST');
      } catch (error) {
        console.error('[Browser Init Error]', error);
      }
    }, 1000);


    // 优雅关闭
    process.on('SIGTERM', async () => {
      console.log('[Shutdown] Closing browser...');
      await crawler.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('[Shutdown] Closing browser...');
      await crawler.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('[Start Error]', error);
    process.exit(1);
  }
}

start();
