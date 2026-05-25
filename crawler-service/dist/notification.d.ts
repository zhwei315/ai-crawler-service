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
export declare class NotificationService {
    private config;
    constructor(config: NotificationConfig);
    isEnabled(): boolean;
    send(message: NotificationMessage): Promise<void>;
    private sendWebhook;
    private sendDingTalk;
    private sendWeCom;
    private sendEmail;
}
//# sourceMappingURL=notification.d.ts.map