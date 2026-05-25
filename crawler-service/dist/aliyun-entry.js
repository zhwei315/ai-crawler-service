"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
exports.timerHandler = timerHandler;
// 阿里云函数计算入口文件
const aliyun_utils_1 = require("./aliyun-utils");
const crawler_1 = require("./crawler");
const deepseek_1 = require("./deepseek");
const health_check_1 = require("./health-check");
const scheduler_1 = require("./scheduler");
// 初始化服务
const crawler = new crawler_1.AICrawler();
const analyzer = new deepseek_1.DeepSeekAnalyzer();
const healthChecker = new health_check_1.HealthChecker();
const scheduler = new scheduler_1.Scheduler();
// 是否已初始化
let initialized = false;
// 初始化
async function init() {
    if (!initialized) {
        await crawler.init();
        initialized = true;
        console.log('[Aliyun FC] Services initialized');
    }
}
// HTTP 请求处理
async function handler(req, res, context) {
    try {
        await init();
        const { path, httpMethod, headers } = req;
        const body = await (0, aliyun_utils_1.getRawBody)(req);
        const jsonBody = body ? JSON.parse(body) : {};
        console.log(`[Aliyun FC] ${httpMethod} ${path}`);
        // 路由处理
        if (path === '/health' && httpMethod === 'GET') {
            return response(res, { status: 'ok', timestamp: new Date().toISOString() });
        }
        if (path === '/health/platforms' && httpMethod === 'GET') {
            const results = await healthChecker.checkAllPlatforms();
            return response(res, {
                status: 'completed',
                results,
                failed: healthChecker.getFailedPlatforms(),
                timestamp: new Date().toISOString(),
            });
        }
        if (path.startsWith('/health/platform/') && httpMethod === 'GET') {
            const platform = path.split('/').pop();
            const result = await healthChecker.checkPlatform(platform);
            return response(res, { platform, ...result, timestamp: new Date().toISOString() });
        }
        if (path === '/crawl' && httpMethod === 'POST') {
            const result = await crawler.crawlPlatform(jsonBody);
            return response(res, result);
        }
        if (path === '/crawl/batch' && httpMethod === 'POST') {
            const results = await Promise.all(jsonBody.map((req) => crawler.crawlPlatform(req)));
            return response(res, results);
        }
        if (path === '/analyze' && httpMethod === 'POST') {
            const result = await analyzer.analyze(jsonBody);
            return response(res, result);
        }
        if (path === '/diagnose' && httpMethod === 'POST') {
            const { platform, brandName, industryWord, questions } = jsonBody;
            // 爬取所有问题
            const crawlRequests = questions.map((q) => ({
                platform,
                question: q.replace(/\{name\}/g, industryWord),
                brandName,
            }));
            const crawlResults = await Promise.all(crawlRequests.map((req) => crawler.crawlPlatform(req)));
            // 分析结果
            const analysisResult = await analyzer.analyze({
                platform,
                brandName,
                questions: crawlResults.map(r => ({
                    platform: r.platform,
                    question: r.question,
                    answer: r.answer,
                    mentions: r.mentions,
                    sources: r.sources,
                })),
            });
            return response(res, { crawlResults, analysis: analysisResult });
        }
        if (path === '/scheduler/trigger' && httpMethod === 'POST') {
            await scheduler.triggerManualCheck();
            return response(res, { status: 'ok', message: 'Health check triggered' });
        }
        // 404
        return response(res, { error: 'Not found' }, 404);
    }
    catch (error) {
        console.error('[Aliyun FC Error]', error);
        return response(res, {
            error: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
}
// 定时任务触发器
async function timerHandler(event, context) {
    try {
        await init();
        console.log('[Aliyun FC Timer] Triggered:', new Date().toISOString());
        await scheduler.triggerManualCheck();
        return { status: 'ok', message: 'Timer executed' };
    }
    catch (error) {
        console.error('[Aliyun FC Timer Error]', error);
        return { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' };
    }
}
// 响应辅助函数
function response(res, data, statusCode = 200) {
    res.setStatusCode(statusCode);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(data));
}
// 阿里云 FC 入口 - 导出默认 handler
exports.default = handler;
//# sourceMappingURL=aliyun-entry.js.map