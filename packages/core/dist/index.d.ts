export type TrustLevel = "USER_PROMPT" | "TRUSTED_TOOL" | "TOOL_CALL" | "TOOL_OUTPUT" | "WEB_PAGE" | "DOCUMENT" | "MCP_OUTPUT" | "UNKNOWN";
export interface Finding {
    detector: string;
    severity: string;
    snippet: string;
    reason: string;
}
export interface ScanResponse {
    blocked: boolean;
    risk: number;
    sanitized_text: string;
    findings: Finding[];
    policy?: {
        reason: string;
    };
}
export interface ProviderTrace {
    provider: "openai" | "openrouter" | "aws";
    model: string;
    source: "workspace" | "environment" | "aws";
    fallback: boolean;
    signal: "semantic" | "inferred-probe" | "activation-probe";
}
export interface ActionDecision {
    allowed: boolean;
    risk: number;
    reason: string;
    findings?: Finding[];
    policy?: {
        id: string;
        name: string;
        version: number;
        threshold: number;
        reason: string;
    };
    provenance?: ProviderTrace[];
    degraded?: boolean;
    trace_id?: string;
}
export interface CheckActionInput {
    tool_call: Record<string, unknown>;
    reasoning_trace: string[];
    trusted_context: string[];
}
export type BatchInput = {
    s3Key: string;
} | {
    items: Array<{
        text: string;
        source: TrustLevel;
    }>;
};
export interface AgentGuardClient {
    scan(text: string, source?: TrustLevel): Promise<ScanResponse>;
    checkAction(input: CheckActionInput): Promise<ActionDecision>;
}
export interface AgentGuardOptions {
    apiKey?: string;
    baseUrl?: string;
    timeoutMs?: number;
    retries?: number;
    fetch?: typeof globalThis.fetch;
}
export declare class AgentGuardError extends Error {
    readonly status: number;
    constructor(message: string, status: number, options?: ErrorOptions);
}
export type GuardStage = "model-input" | "tool-call" | "tool-output";
export declare class AgentGuardBlockedError extends AgentGuardError {
    readonly stage: GuardStage;
    readonly risk: number;
    readonly decision: unknown;
    constructor(message: string, stage: GuardStage, risk: number, decision: unknown);
}
export declare class AgentGuard implements AgentGuardClient {
    private readonly options;
    private readonly fetchImplementation;
    constructor(options?: AgentGuardOptions);
    private request;
    private requireApiKey;
    scan(text: string, source?: TrustLevel): Promise<ScanResponse>;
    checkAction(input: CheckActionInput): Promise<ActionDecision>;
    submitBatch(input: BatchInput): Promise<{
        jobId: string;
    }>;
    job(id: string): Promise<{
        status: string;
        result?: unknown;
    }>;
}
export interface MiddlewareOptions {
    trustedContext?: string[] | (() => string[] | Promise<string[]>);
}
export declare function serializeForScan(value: unknown): string;
export declare class AgentGuardMiddleware {
    private readonly client;
    private readonly options;
    constructor(client?: AgentGuardClient, options?: MiddlewareOptions);
    beforeModel(content: string, source?: TrustLevel): Promise<ScanResponse>;
    guardModelInput<T>(input: T, source?: TrustLevel): Promise<T>;
    beforeTool(name: string, arguments_: Record<string, unknown>, trustedContext?: string[]): Promise<ActionDecision>;
    afterTool<T>(output: T, source?: TrustLevel): Promise<T>;
    wrapTool<TArguments extends unknown[], TResult>(name: string, execute: (...arguments_: TArguments) => TResult | Promise<TResult>, trustedContext?: string[]): (...arguments_: TArguments) => Promise<TResult>;
}
//# sourceMappingURL=index.d.ts.map