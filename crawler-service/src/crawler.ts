import { chromium, Browser, Page } from 'playwright';
import { execSync } from 'child_process';
import { PLATFORM_CONFIGS } from './platforms';
import { CrawlRequest, CrawlResponse, MentionInfo, SourceInfo } from './types';

// 反爬虫配置
const ANTI_CRAWL_CONFIG = {
  // 请求间隔（毫秒）
  delayMin: parseInt(process.env.REQUEST_DELAY_MIN || '3000'),
  delayMax: parseInt(process.env.REQUEST_DELAY_MAX || '8000'),
  // 随机鼠标移动
  enableMouseMove: true,
  // 随机滚动
  enableRandomScroll: true,
  // UserAgent轮换
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
  ],
  // 视口大小轮换
  viewports: [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 },
    { width: 1280, height: 720 },
  ],
};

export class AICrawler {
  private browser: Browser | null = null;
  private maxRetries = 3;
  private timeout = parseInt(process.env.BROWSER_TIMEOUT || '120000');
  private lastRequestTime = 0;

  async init() {
    // 在阿里云环境中自动下载浏览器
    const browserPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
    if (browserPath && !process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD) {
      try {
        console.log('[Crawler] Installing Chromium browser...');
        execSync('npx playwright install chromium', {
          stdio: 'pipe',
          timeout: 180000,
          env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browserPath }
        });
        console.log('[Crawler] Chromium installed successfully');
      } catch (e) {
        console.warn('[Crawler] Failed to install Chromium:', e);
      }
    }

    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // 获取随机UserAgent
  private getRandomUserAgent(): string {
    const index = Math.floor(Math.random() * ANTI_CRAWL_CONFIG.userAgents.length);
    return ANTI_CRAWL_CONFIG.userAgents[index];
  }

  // 获取随机视口
  private getRandomViewport() {
    const index = Math.floor(Math.random() * ANTI_CRAWL_CONFIG.viewports.length);
    return ANTI_CRAWL_CONFIG.viewports[index];
  }

  // 随机延时
  private async randomDelay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelay = ANTI_CRAWL_CONFIG.delayMin;
    
    // 确保最小间隔
    if (timeSinceLastRequest < minDelay) {
      await this.sleep(minDelay - timeSinceLastRequest);
    }
    
    // 额外随机延时
    const randomDelay = Math.floor(
      Math.random() * (ANTI_CRAWL_CONFIG.delayMax - ANTI_CRAWL_CONFIG.delayMin) + 
      ANTI_CRAWL_CONFIG.delayMin
    );
    await this.sleep(randomDelay);
    this.lastRequestTime = Date.now();
  }

  // 模拟人类鼠标移动
  private async simulateMouseMove(page: Page): Promise<void> {
    if (!ANTI_CRAWL_CONFIG.enableMouseMove) return;
    
    const viewport = page.viewportSize();
    if (!viewport) return;
    
    // 随机移动几次
    const moves = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < moves; i++) {
      const x = Math.floor(Math.random() * viewport.width * 0.8) + 50;
      const y = Math.floor(Math.random() * viewport.height * 0.8) + 50;
      await page.mouse.move(x, y, { steps: 10 });
      await this.sleep(Math.floor(Math.random() * 300) + 100);
    }
  }

  // 模拟随机滚动
  private async simulateRandomScroll(page: Page): Promise<void> {
    if (!ANTI_CRAWL_CONFIG.enableRandomScroll) return;
    
    // 随机滚动几次
    const scrolls = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < scrolls; i++) {
      const scrollY = Math.floor(Math.random() * 300) + 100;
      await page.evaluate((y: number) => { (globalThis as any).scrollBy(0, y); }, scrollY);
      await this.sleep(Math.floor(Math.random() * 500) + 200);
    }
  }

  // 模拟人类输入
  private async simulateHumanTyping(page: Page, selector: string, text: string): Promise<void> {
    // 先点击输入框
    await page.click(selector);
    await this.sleep(Math.floor(Math.random() * 200) + 100);
    
    // 逐字输入，模拟人类打字速度
    for (const char of text) {
      await page.type(selector, char, { delay: Math.floor(Math.random() * 100) + 50 });
    }
    
    // 偶尔停顿一下
    if (Math.random() > 0.7) {
      await this.sleep(Math.floor(Math.random() * 1000) + 500);
    }
  }

  async crawlPlatform(request: CrawlRequest): Promise<CrawlResponse> {
    const { platform, question, brandName } = request;
    const config = PLATFORM_CONFIGS[platform];

    if (!config) {
      return {
        platform,
        question,
        answer: '',
        mentions: [],
        sources: [],
        error: `未知平台: ${platform}`,
      };
    }

    if (!this.browser) {
      await this.init();
    }

    // 反爬虫延时
    await this.randomDelay();

    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        const result = await this.crawlWithBrowser(config, question, brandName);
        return {
          platform,
          question,
          ...result,
        };
      } catch (error) {
        retries++;
        console.error(`爬取 ${platform} 失败 (尝试 ${retries}/${this.maxRetries}):`, error);
        if (retries >= this.maxRetries) {
          return {
            platform,
            question,
            answer: '',
            mentions: [],
            sources: [],
            error: `爬取失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
        // 失败后增加更长延时
        await this.sleep(5000 * retries + Math.floor(Math.random() * 3000));
      }
    }

    return {
      platform,
      question,
      answer: '',
      mentions: [],
      sources: [],
      error: '达到最大重试次数',
    };
  }

  private async crawlWithBrowser(
    config: typeof PLATFORM_CONFIGS[string],
    question: string,
    brandName: string
  ): Promise<{ answer: string; mentions: MentionInfo[]; sources: SourceInfo[]; rawHtml?: string }> {
    if (!this.browser) throw new Error('Browser not initialized');

    const userAgent = this.getRandomUserAgent();
    const viewport = this.getRandomViewport();

    const context = await this.browser.newContext({
      userAgent,
      viewport,
      deviceScaleFactor: Math.random() > 0.5 ? 1 : 2,
      locale: 'zh-CN',
      timezoneId: 'Asia/Shanghai',
    });

    const page = await context.newPage();

    try {
      // 访问平台
      await page.goto(config.url, { waitUntil: 'networkidle', timeout: this.timeout });
      
      // 模拟鼠标移动
      await this.simulateMouseMove(page);
      
      // 模拟滚动
      await this.simulateRandomScroll(page);

      // 等待输入框
      await page.waitForSelector(config.selector.input, { timeout: 10000 });
      
      // 模拟人类输入
      await this.simulateHumanTyping(page, config.selector.input, question);
      
      // 随机延时后点击发送
      await this.sleep(Math.floor(Math.random() * 500) + 300);
      await page.click(config.selector.submit);

      // 等待回答生成
      await this.waitForAnswer(page, config.selector);
      
      // 模拟滚动查看完整回答
      await this.simulateRandomScroll(page);

      // 获取回答内容
      const answer = await page.$eval(config.selector.answer, el => el.textContent || '');
      const rawHtml = await page.content();

      // 解析提及信息
      const mentions = this.parseMentions(answer, brandName);

      // 解析来源
      const sources = this.parseSources(answer);

      return {
        answer,
        mentions,
        sources,
        rawHtml,
      };
    } finally {
      await context.close();
    }
  }

  private async waitForAnswer(
    page: Page,
    selector: typeof PLATFORM_CONFIGS[string]['selector']
  ) {
    const startTime = Date.now();
    while (Date.now() - startTime < this.timeout) {
      try {
        const loading = await page.$(selector.loading);
        if (!loading) {
          const answer = await page.$(selector.answer);
          if (answer) {
            const text = await answer.textContent();
            if (text && text.length > 10) {
              // 随机延时确保内容完整
              await this.sleep(Math.floor(Math.random() * 1000) + 1000);
              return;
            }
          }
        }
      } catch {
        // 忽略错误
      }
      await this.sleep(500);
    }
    throw new Error('等待回答超时');
  }

  private parseMentions(answer: string, brandName: string): MentionInfo[] {
    const brands = brandName.split(',').map(b => b.trim()).filter(b => b);
    const mentions: MentionInfo[] = [];

    for (const brand of brands) {
      const mentioned = answer.toLowerCase().includes(brand.toLowerCase());
      let context = '';

      if (mentioned) {
        const regex = new RegExp(`[^。！？.!?]*${brand}[^。！？.!?]*`, 'gi');
        const matches = answer.match(regex);
        context = matches ? matches.join('；').substring(0, 200) : '';
      }

      mentions.push({
        brand,
        mentioned,
        context,
      });
    }

    return mentions;
  }

  private parseSources(answer: string): SourceInfo[] {
    const sources: SourceInfo[] = [];

    const sourcePatterns = [
      { name: '知乎', pattern: /知乎/g },
      { name: '百度知道', pattern: /百度知道/g },
      { name: '小红书', pattern: /小红书/g },
      { name: '今日头条', pattern: /今日头条|头条/g },
      { name: '抖音', pattern: /抖音/g },
      { name: '微博', pattern: /微博/g },
      { name: 'B站', pattern: /B站|bilibili|哔哩哔哩/g },
      { name: '淘宝', pattern: /淘宝|天猫/g },
      { name: '京东', pattern: /京东/g },
    ];

    for (const { name, pattern } of sourcePatterns) {
      const matches = answer.match(pattern);
      if (matches) {
        sources.push({
          name,
          url: '',
          snippet: `被提及 ${matches.length} 次`,
        });
      }
    }

    sources.sort((a, b) => {
      const countA = parseInt(a.snippet.match(/\d+/)?.[0] || '0');
      const countB = parseInt(b.snippet.match(/\d+/)?.[0] || '0');
      return countB - countA;
    });

    return sources.slice(0, 5);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
