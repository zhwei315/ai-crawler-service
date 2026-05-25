export declare class Scheduler {
    private healthChecker;
    private notificationConfig;
    constructor();
    private loadNotificationConfig;
    start(): void;
    private runHealthCheck;
    private generateReport;
    private sendNotification;
    private sendWebhookNotification;
    private sendDingTalkNotification;
    private sendWeComNotification;
    private sendEmailNotification;
    triggerManualCheck(): Promise<void>;
}
//# sourceMappingURL=scheduler.d.ts.map