import { CrawlRequest, CrawlResponse } from './types';
export declare class AICrawler {
    private browser;
    private maxRetries;
    private timeout;
    private lastRequestTime;
    init(): Promise<void>;
    close(): Promise<void>;
    private getRandomUserAgent;
    private getRandomViewport;
    private randomDelay;
    private simulateMouseMove;
    private simulateRandomScroll;
    private simulateHumanTyping;
    crawlPlatform(request: CrawlRequest): Promise<CrawlResponse>;
    private crawlWithBrowser;
    private waitForAnswer;
    private parseMentions;
    private parseSources;
    private sleep;
}
//# sourceMappingURL=crawler.d.ts.map