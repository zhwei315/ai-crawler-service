"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthChecker = void 0;
exports.autoDetectSelectors = autoDetectSelectors;
const playwright_1 = require("playwright");
const platforms_1 = require("./platforms");
// 网页结构健康检查
class HealthChecker {
    constructor() {
        this.results = new Map();
    }
    // 检查单个平台
    async checkPlatform(platform) {
        const config = platforms_1.PLATFORM_CONFIGS[platform];
        if (!config) {
            return { status: 'error', message: `未知平台: ${platform}` };
        }
        const browser = await playwright_1.chromium.launch({
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
            const missingElements = [];
            for (const check of checks) {
                try {
                    await page.waitForSelector(check.selector, { timeout: 5000 });
                }
                catch {
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.results.set(platform, { status: 'error', message, timestamp: new Date() });
            return { status: 'error', message };
        }
        finally {
            await browser.close();
        }
    }
    // 检查所有平台
    async checkAllPlatforms() {
        const results = {};
        for (const platform of Object.keys(platforms_1.PLATFORM_CONFIGS)) {
            console.log(`[HealthCheck] Checking ${platform}...`);
            results[platform] = await this.checkPlatform(platform);
            // 添加延时避免请求过快
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        return results;
    }
    // 获取检查结果
    getResults() {
        return Object.fromEntries(this.results);
    }
    // 获取需要更新的平台
    getFailedPlatforms() {
        return Array.from(this.results.entries())
            .filter(([_, result]) => result.status === 'error')
            .map(([platform, _]) => platform);
    }
}
exports.HealthChecker = HealthChecker;
// 自动检测选择器是否失效
async function autoDetectSelectors(platform, html) {
    const suggestions = {};
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
                    suggestions[key] = `.${classMatch[1].split(' ')[0]}`;
                    break;
                }
                else if (idMatch) {
                    suggestions[key] = `#${idMatch[1]}`;
                    break;
                }
            }
        }
    }
    return suggestions;
}
//# sourceMappingURL=health-check.js.map