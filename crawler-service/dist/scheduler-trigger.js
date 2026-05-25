"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// 定时触发器入口 - 阿里云函数计算
const health_check_1 = require("./health-check");
const notification_1 = require("./notification");
// 健康检查配置
const healthChecker = new health_check_1.HealthChecker();
// 通知服务
const notificationService = new notification_1.NotificationService({
    enabled: process.env.NOTIFICATION_ENABLED === 'true',
    type: process.env.NOTIFICATION_TYPE || 'webhook',
    webhook: {
        url: process.env.NOTIFICATION_WEBHOOK_URL || '',
    },
});
// 阿里云函数计算 handler
const handler = async (event, context) => {
    console.log('[Scheduler] Weekly health check triggered', { event, requestId: context.requestId });
    try {
        // 执行健康检查
        const results = await healthChecker.checkAllPlatforms();
        // 统计失败的平台
        const failedPlatforms = [];
        for (const [platform, result] of Object.entries(results)) {
            if (result.status === 'error') {
                failedPlatforms.push(platform);
            }
        }
        // 生成报告
        const report = {
            timestamp: new Date().toISOString(),
            totalPlatforms: Object.keys(results).length,
            healthyPlatforms: Object.keys(results).length - failedPlatforms.length,
            failedPlatforms: failedPlatforms.length,
            details: results,
        };
        console.log('[Scheduler] Health check completed', report);
        // 发送通知
        if (failedPlatforms.length > 0 && notificationService.isEnabled()) {
            await notificationService.send({
                title: 'AI爬虫服务健康检查报告',
                message: `检测到 ${failedPlatforms.length} 个平台异常: ${failedPlatforms.join(', ')}`,
                data: report,
            });
        }
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                report,
            }),
        };
    }
    catch (error) {
        console.error('[Scheduler] Health check failed:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
};
exports.handler = handler;
// 如果是直接运行（本地测试）
if (require.main === module) {
    (0, exports.handler)({}, { requestId: 'local-test' }).then(console.log).catch(console.error);
}
//# sourceMappingURL=scheduler-trigger.js.map