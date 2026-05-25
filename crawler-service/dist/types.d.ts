export interface CrawlRequest {
    platform: string;
    question: string;
    brandName: string;
}
export interface CrawlResponse {
    platform: string;
    question: string;
    answer: string;
    mentions: MentionInfo[];
    sources: SourceInfo[];
    rawHtml?: string;
    error?: string;
}
export interface MentionInfo {
    brand: string;
    mentioned: boolean;
    context: string;
}
export interface SourceInfo {
    name: string;
    url: string;
    snippet: string;
}
export interface AnalysisRequest {
    platform: string;
    brandName: string;
    questions: CrawlResponse[];
}
export interface AnalysisResponse {
    platform: string;
    overallScore: number;
    visibilityScore: number;
    mentionRate: number;
    positiveRate: number;
    negativeRate: number;
    positiveQuestions: QuestionResult[];
    negativeQuestions: QuestionResult[];
    topSources: SourceInfo[];
    analysis: string;
}
export interface QuestionResult {
    question: string;
    isMentioned: boolean;
    mentionedBrands: string;
    context: string;
}
export interface PlatformConfig {
    name: string;
    url: string;
    selector: {
        input: string;
        submit: string;
        answer: string;
        loading: string;
    };
}
//# sourceMappingURL=types.d.ts.map