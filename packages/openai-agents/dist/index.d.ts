import { AgentGuardMiddleware } from "@agentguard/core";
export interface OpenAIAgentsToolLike<TContext = unknown, TInput = unknown, TOutput = unknown, TInvokeDetails extends unknown[] = unknown[]> {
    name: string;
    invoke(context: TContext, input: TInput, ...details: TInvokeDetails): TOutput | Promise<TOutput>;
}
export interface OpenAIAgentsRunResultLike<TOutput = unknown> {
    finalOutput?: TOutput;
    [key: string]: unknown;
}
export interface AdapterOptions {
    middleware?: AgentGuardMiddleware;
    trustedContext?: string[];
}
/**
 * Wraps an OpenAI Agents function tool while retaining its SDK-specific fields.
 * No import from `@openai/agents` is needed at runtime.
 */
export declare function wrapOpenAIAgentsTool<TContext, TInput, TOutput, TInvokeDetails extends unknown[], TTool extends OpenAIAgentsToolLike<TContext, TInput, TOutput, TInvokeDetails>>(tool: TTool, options?: AdapterOptions): TTool;
export declare function guardOpenAIAgentsInput<T>(input: T, middleware?: AgentGuardMiddleware): Promise<T>;
/**
 * Returns a result with a guarded `finalOutput`, preserving the original prototype.
 */
export declare function guardOpenAIAgentsResult<TOutput, TResult extends OpenAIAgentsRunResultLike<TOutput>>(result: TResult, middleware?: AgentGuardMiddleware): Promise<TResult>;
//# sourceMappingURL=index.d.ts.map