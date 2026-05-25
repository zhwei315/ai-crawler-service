import { PLATFORM_CONFIGS } from './platforms';
export declare class HealthChecker {
    private results;
    checkPlatform(platform: string): Promise<{
        status: 'ok' | 'error';
        message: string;
    }>;
    checkAllPlatforms(): Promise<Record<string, {
        status: 'ok' | 'error';
        message: string;
    }>>;
    getResults(): Record<string, {
        status: 'ok' | 'error';
        message: string;
        timestamp: Date;
    }>;
    getFailedPlatforms(): string[];
}
export declare function autoDetectSelectors(platform: string, html: string): Promise<Partial<typeof PLATFORM_CONFIGS[string]['selector']>>;
//# sourceMappingURL=health-check.d.ts.map