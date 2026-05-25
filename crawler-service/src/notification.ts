// 通知服务
export interface NotificationConfig {
  enabled: boolean;
  type: 'webhook' | 'dingtalk' | 'wecom' | 'email';
  webhook?: {
    url: string;
  };
  dingtalk?: {
    webhook: string;
    secret?: string;
  };
  wecom?: {
    webhook: string;
  };
  email?: {
    smtp: string;
    port: number;
    user: string;
    pass: string;
    from: string;
    to: string[];
  };
}

export interface NotificationMessage {
  title: string;
  message: string;
  data?: any;
}

export class NotificationService {
  private config: NotificationConfig;

  constructor(config: NotificationConfig) {
    this.config = config;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  async send(message: NotificationMessage): Promise<void> {
    if (!this.config.enabled) {
      console.log('[Notification] Notifications disabled');
      return;
    }

    try {
      switch (this.config.type) {
        case 'webhook':
          await this.sendWebhook(message);
          break;
        case 'dingtalk':
          await this.sendDingTalk(message);
          break;
        case 'wecom':
          await this.sendWeCom(message);
          break;
        case 'email':
          await this.sendEmail(message);
          break;
        default:
          console.warn('[Notification] Unknown notification type:', this.config.type);
      }
    } catch (error) {
      console.error('[Notification] Failed to send notification:', error);
    }
  }

  private async sendWebhook(message: NotificationMessage): Promise<void> {
    if (!this.config.webhook?.url) {
      console.warn('[Notification] Webhook URL not configured');
      return;
    }

    const response = await fetch(this.config.webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: message.title,
        message: message.message,
        data: message.data,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`);
    }

    console.log('[Notification] Webhook sent successfully');
  }

  private async sendDingTalk(message: NotificationMessage): Promise<void> {
    if (!this.config.dingtalk?.webhook) {
      console.warn('[Notification] DingTalk webhook not configured');
      return;
    }

    const response = await fetch(this.config.dingtalk.webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        msgtype: 'markdown',
        markdown: {
          title: message.title,
          text: `## ${message.title}\n\n${message.message}`,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`DingTalk failed: ${response.status}`);
    }

    console.log('[Notification] DingTalk sent successfully');
  }

  private async sendWeCom(message: NotificationMessage): Promise<void> {
    if (!this.config.wecom?.webhook) {
      console.warn('[Notification] WeCom webhook not configured');
      return;
    }

    const response = await fetch(this.config.wecom.webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        msgtype: 'markdown',
        markdown: {
          content: `## ${message.title}\n\n${message.message}`,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`WeCom failed: ${response.status}`);
    }

    console.log('[Notification] WeCom sent successfully');
  }

  private async sendEmail(message: NotificationMessage): Promise<void> {
    console.log('[Notification] Email notification not implemented yet');
  }
}
