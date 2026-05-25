import { chromium } from 'playwright';
import { PLATFORM_CONFIGS } from './platforms';

// 网页结构健康检查
export class HealthChecker {
  private results: Map<string, { status: 'ok' | 'error'; message: string; timestamp: Date }> = new Map();

  // 检查单个平台
  async checkPlatform(platform: string): Promise<{ status: 'ok' | 'error'; message: string }> {
    const config = PLATFORM_CONFIGS[platform];
    if (!config) {
      return { status: 'error', message: `未知平台: ${platform}` };
    }

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      });

      const page = await context.newPage();

      // 访问平台
      await page.goto(config.url, { waitUntil: 'networkidle', timeout: 30000 });

      // 检查关键元素是否存在
      const checks = [
        { name: 'input', selector: config.selector.input },
        { name: 'submit', selector: config.selector.submit },
        { name: 'answer', selector: config.selector.answer },
      ];

      const missingElements: string[] = [];

      for (const check of checks) {
        try {
          await page.waitForSelector(check.selector, { timeout: 5000 });
        } catch {
          missingElements.push(check.name);
        }
      }

      await context.close();

      if (missingElements.length > 0) {
        const message = `元素选择器失效: ${missingElements.join(', ')}`;
        this.results.set(platform, { status: 'error', message, timestamp: new Date() });
        return { status: 'error', message };
      }

      const message = '所有元素选择器正常';
      this.results.set(platform, { status: 'ok', message, timestamp: new Date() });
      return { status: 'ok', message };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.results.set(platform, { status: 'error', message, timestamp: new Date() });
      return { status: 'error', message };
    } finally {
      await browser.close();
    }
  }

  // 检查所有平台
  async checkAllPlatforms(): Promise<Record<string, { status: 'ok' | 'error'; message: string }>> {
    const results: Record<string, { status: 'ok' | 'error'; message: string }> = {};

    for (const platform of Object.keys(PLATFORM_CONFIGS)) {
      console.log(`[HealthCheck] Checking ${platform}...`);
      results[platform] = await this.checkPlatform(platform);
      // 添加延时避免请求过快
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return results;
  }

  // 获取检查结果
  getResults(): Record<string, { status: 'ok' | 'error'; message: string; timestamp: Date }> {
    return Object.fromEntries(this.results);
  }

  // 获取需要更新的平台
  getFailedPlatforms(): string[] {
    return Array.from(this.results.entries())
      .filter(([_, result]) => result.status === 'error')
      .map(([platform, _]) => platform);
  }
}

// 自动检测选择器是否失效
export async function autoDetectSelectors(platform: string, html: string): Promise<Partial<typeof PLATFORM_CONFIGS[string]['selector']>> {
  const suggestions: Partial<typeof PLATFORM_CONFIGS[string]['selector']> = {};

  // 基于常见模式推测选择器
  const patterns = {
    input: [
      /textarea[^>]*placeholder/i,
      /input[^>]*type=["']text["']/i,
      /div[^>]*contenteditable/i,
    ],
    submit: [
      /button[^>]*type=["']submit["']/i,
      /button[^>]*send/i,
      /div[^>]*send-btn/i,
    ],
    answer: [
      /div[^>]*markdown/i,
      /div[^>]*message-content/i,
      /div[^>]*chat-message/i,
    ],
    loading: [
      /div[^>]*loading/i,
      /div[^>]*spinner/i,
      /div[^>]*progress/i,
    ],
  };

  for (const [key, regexList] of Object.entries(patterns)) {
    for (const regex of regexList) {
      const match = html.match(regex);
      if (match) {
        // 提取可能的class或id
        const classMatch = match[0].match(/class=["']([^"']+)["']/);
        const idMatch = match[0].match(/id=["']([^"']+)["']/);
        
        if (classMatch) {
          suggestions[key as keyof typeof suggestions] = `.${classMatch[1].split(' ')[0]}`;
          break;
        } else if (idMatch) {
          suggestions[key as keyof typeof suggestions] = `#${idMatch[1]}`;
          break;
        }
      }
    }
  }

  return suggestions;
}
