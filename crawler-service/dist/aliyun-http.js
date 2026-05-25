"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// 阿里云函数计算 HTTP 模式入口
const http_1 = __importDefault(require("http"));
const crawler_1 = require("./crawler");
const deepseek_1 = require("./deepseek");
const health_check_1 = require("./health-check");
const crawler = new crawler_1.AICrawler();
const analyzer = new deepseek_1.DeepSeekAnalyzer();
const healthChecker = new health_check_1.HealthChecker();
let initialized = false;
async function init() {
    if (!initialized) {
        await crawler.init();
        initialized = true;
        console.log('[Aliyun HTTP] Services initialized');
    }
}
const server = http_1.default.createServer(async (req, res) => {
    try {
        await init();
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        const path = url.pathname;
        const method = req.method || 'GET';
        console.log(`[Aliyun HTTP] ${method} ${path}`);
        // 设置 CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        // 解析请求体
        let body = {};
        if (method === 'POST' || method === 'PUT') {
            const chunks = [];
            for await (const chunk of req) {
                chunks.push(chunk);
            }
            const data = Buffer.concat(chunks).toString();
            if (data) {
                try {
                    body = JSON.parse(data);
                }
                catch {
                    body = {};
                }
            }
        }
        // 路由处理
        if (path === '/health' && method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
            return;
        }
        if (path === '/crawl' && method === 'POST') {
            const result = await crawler.crawlPlatform(body);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
        }
        if (path === '/analyze' && method === 'POST') {
            const result = await analyzer.analyze(body);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
        }
        if (path === '/diagnose' && method === 'POST') {
            const { platform, brandName, industryWord, questions } = body;
            const crawlRequests = questions.map((q) => ({
                platform,
                question: q.replace(/\{name\}/g, industryWord),
                brandName,
            }));
            const crawlResults = await Promise.all(crawlRequests.map((req) => crawler.crawlPlatform(req)));
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
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ crawlResults, analysis: analysisResult }));
            return;
        }
        // 404
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
    catch (error) {
        console.error('[Aliyun HTTP Error]', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error'
        }));
    }
});
const PORT = process.env.PORT || 9000;
server.listen(PORT, () => {
    console.log(`[Aliyun HTTP] Server listening on port ${PORT}`);
});
// 优雅关闭
process.on('SIGTERM', () => {
    console.log('[Aliyun HTTP] SIGTERM received, shutting down');
    server.close(() => {
        crawler.close().then(() => {
            process.exit(0);
        });
    });
});
//# sourceMappingURL=aliyun-http.js.map