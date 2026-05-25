// 定时触发器入口 - 阿里云函数计算
import { HealthChecker } from './health-check';
import { NotificationService } from './notification';

// 健康检查配置
const healthChecker = new HealthChecker();

// 通知服务
const notificationService = new NotificationService({
  enabled: process.env.NOTIFICATION_ENABLED === 'true',
  type: (process.env.NOTIFICATION_TYPE as any) || 'webhook',
  webhook: {
    url: process.env.NOTIFICATION_WEBHOOK_URL || '',
  },
});

// 阿里云函数计算 handler
export const handler = async (event: any, context: any) => {
  console.log('[Scheduler] Weekly health check triggered', { event, requestId: context.requestId });

  try {
    // 执行健康检查
    const results = await healthChecker.checkAllPlatforms();
    
    // 统计失败的平台
    const failedPlatforms: string[] = [];
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
  } catch (error) {
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

// 如果是直接运行（本地测试）
if (require.main === module) {
  handler({}, { requestId: 'local-test' }).then(console.log).catch(console.error);
}
