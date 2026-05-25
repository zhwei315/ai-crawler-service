import cron from 'node-cron';
import { HealthChecker } from './health-check';

// 通知配置
interface NotificationConfig {
  type: 'email' | 'webhook' | 'dingtalk' | 'wecom';
  enabled: boolean;
  config: Record<string, string>;
}

export class Scheduler {
  private healthChecker: HealthChecker;
  private notificationConfig: NotificationConfig;

  constructor() {
    this.healthChecker = new HealthChecker();
    this.notificationConfig = this.loadNotificationConfig();
  }

  // 加载通知配置
  private loadNotificationConfig(): NotificationConfig {
    const type = process.env.NOTIFICATION_TYPE as 'email' | 'webhook' | 'dingtalk' | 'wecom' || 'webhook';
    const enabled = process.env.NOTIFICATION_ENABLED === 'true';
    
    return {
      type,
      enabled,
      config: {
        webhookUrl: process.env.NOTIFICATION_WEBHOOK_URL || '',
        emailTo: process.env.NOTIFICATION_EMAIL_TO || '',
        emailFrom: process.env.NOTIFICATION_EMAIL_FROM || '',
        smtpHost: process.env.SMTP_HOST || '',
        smtpPort: process.env.SMTP_PORT || '',
        smtpUser: process.env.SMTP_USER || '',
        smtpPass: process.env.SMTP_PASS || '',
      },
    };
  }

  // 启动定时任务 - 每周一凌晨 2:00
  start() {
    console.log('[Scheduler] Starting weekly health check scheduler...');
    
    // 每周一凌晨 2:00 执行
    // cron 格式: 秒 分 时 日 月 周
    cron.schedule('0 0 2 * * 1', async () => {
      console.log('[Scheduler] Running weekly health check...');
      await this.runHealthCheck();
    }, {
      timezone: 'Asia/Shanghai',
    } as any);

    console.log('[Scheduler] Scheduler started. Next run: Every Monday at 02:00 CST');
  }

  // 执行健康检查
  private async runHealthCheck() {
    try {
      const results = await this.healthChecker.checkAllPlatforms();
      const failed = this.healthChecker.getFailedPlatforms();

      // 生成报告
      const report = this.generateReport(results, failed);
      
      // 发送通知
      if (this.notificationConfig.enabled) {
        await this.sendNotification(report);
      }

      console.log('[Scheduler] Health check completed:', report);
    } catch (error) {
      console.error('[Scheduler] Health check failed:', error);
      await this.sendNotification({
        status: 'error',
        message: `健康检查执行失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 生成检查报告
  private generateReport(
    results: Record<string, { status: 'ok' | 'error'; message: string }>,
    failed: string[]
  ) {
    const total = Object.keys(results).length;
    const success = total - failed.length;
    const successRate = Math.round((success / total) * 100);

    return {
      status: failed.length === 0 ? 'ok' : 'warning',
      summary: `平台健康检查完成: ${success}/${total} 正常 (${successRate}%)`,
      failed,
      details: results,
      timestamp: new Date().toISOString(),
    };
  }

  // 发送通知
  private async sendNotification(report: any) {
    try {
      switch (this.notificationConfig.type) {
        case 'webhook':
          await this.sendWebhookNotification(report);
          break;
        case 'dingtalk':
          await this.sendDingTalkNotification(report);
          break;
        case 'wecom':
          await this.sendWeComNotification(report);
          break;
        case 'email':
          await this.sendEmailNotification(report);
          break;
        default:
          console.log('[Scheduler] Notification:', JSON.stringify(report, null, 2));
      }
    } catch (error) {
      console.error('[Scheduler] Failed to send notification:', error);
    }
  }

  // Webhook 通知
  private async sendWebhookNotification(report: any) {
    const url = this.notificationConfig.config.webhookUrl;
    if (!url) {
      console.warn('[Scheduler] Webhook URL not configured');
      return;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'AI平台爬虫健康检查报告',
        content: report,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`);
    }
  }

  // 钉钉通知
  private async sendDingTalkNotification(report: any) {
    const url = this.notificationConfig.config.webhookUrl;
    if (!url) {
      console.warn('[Scheduler] DingTalk webhook URL not configured');
      return;
    }

    const isOk = report.status === 'ok';
    const color = isOk ? '#00ff00' : '#ff0000';
    const emoji = isOk ? '✅' : '⚠️';

    const message = {
      msgtype: 'markdown',
      markdown: {
        title: 'AI平台爬虫健康检查',
        text: `## ${emoji} AI平台爬虫健康检查报告

**检查时间**: ${new Date().toLocaleString('zh-CN')}

**总体状态**: ${report.summary}

${report.failed.length > 0 ? `**异常平台**: ${report.failed.join(', ')}` : '所有平台正常'}

**详细结果**:
${Object.entries(report.details).map(([platform, result]: [string, any]) => {
  const status = result.status === 'ok' ? '✅' : '❌';
  return `- ${status} **${platform}**: ${result.message}`;
}).join('\n')}
`,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`DingTalk webhook failed: ${response.status}`);
    }
  }

  // 企业微信通知
  private async sendWeComNotification(report: any) {
    const url = this.notificationConfig.config.webhookUrl;
    if (!url) {
      console.warn('[Scheduler] WeCom webhook URL not configured');
      return;
    }

    const isOk = report.status === 'ok';
    const message = {
      msgtype: 'markdown',
      markdown: {
        content: `**AI平台爬虫健康检查报告**\n
> 检查时间: ${new Date().toLocaleString('zh-CN')}
> 总体状态: ${report.summary}

${report.failed.length > 0 ? `**异常平台**: ${report.failed.join(', ')}` : '✅ 所有平台正常'}

**详细结果**:
${Object.entries(report.details).map(([platform, result]: [string, any]) => {
  const status = result.status === 'ok' ? '✅' : '❌';
  return `${status} ${platform}: ${result.message}`;
}).join('\n')}
`,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`WeCom webhook failed: ${response.status}`);
    }
  }

  // 邮件通知（简化版，实际使用需要 nodemailer）
  private async sendEmailNotification(report: any) {
    console.log('[Scheduler] Email notification:', JSON.stringify(report, null, 2));
    // 实际实现需要安装 nodemailer
  }

  // 手动触发检查
  async triggerManualCheck() {
    console.log('[Scheduler] Manual health check triggered');
    await this.runHealthCheck();
  }
}
