import { AnalysisRequest, AnalysisResponse } from './types';
export declare class DeepSeekAnalyzer {
    analyze(request: AnalysisRequest): Promise<AnalysisResponse>;
    private buildAnalysisPrompt;
    private parseAnalysisResult;
    private ruleBasedAnalysis;
    private extractSourcesFromAnswer;
}
//# sourceMappingURL=deepseek.d.ts.map