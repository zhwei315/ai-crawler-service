"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
class NotificationService {
    constructor(config) {
        this.config = config;
    }
    isEnabled() {
        return this.config.enabled;
    }
    async send(message) {
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
        }
        catch (error) {
            console.error('[Notification] Failed to send notification:', error);
        }
    }
    async sendWebhook(message) {
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
    async sendDingTalk(message) {
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
    async sendWeCom(message) {
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
    async sendEmail(message) {
        console.log('[Notification] Email notification not implemented yet');
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notification.js.map