import { AgentGuardMiddleware } from "@agentguard/core";
export interface McpTextContent {
    type: "text";
    text: string;
    [key: string]: unknown;
}
export interface McpNonTextContent {
    type: string;
    [key: string]: unknown;
}
export interface McpToolResult {
    content?: Array<McpTextContent | McpNonTextContent>;
    structuredContent?: Record<string, unknown>;
    [key: string]: unknown;
}
export type McpToolHandler<TArguments extends Record<string, unknown> = Record<string, unknown>, TExtra = unknown, TResult extends McpToolResult = McpToolResult> = (arguments_: TArguments, extra: TExtra) => TResult | Promise<TResult>;
export interface McpServerLike {
    registerTool<TConfig, THandler>(name: string, config: TConfig, handler: THandler): unknown;
}
export interface AdapterOptions {
    middleware?: AgentGuardMiddleware;
    trustedContext?: string[];
}
/**
 * Scans text and structured MCP content while preserving all protocol fields.
 */
export declare function guardMcpResult<TResult extends McpToolResult>(result: TResult, middleware?: AgentGuardMiddleware): Promise<TResult>;
export declare function wrapMcpToolHandler<TArguments extends Record<string, unknown>, TExtra, TResult extends McpToolResult>(name: string, handler: McpToolHandler<TArguments, TExtra, TResult>, options?: AdapterOptions): McpToolHandler<TArguments, TExtra, TResult>;
/**
 * Registers a guarded handler on an MCP SDK-compatible server.
 */
export declare function registerGuardedMcpTool<TConfig, TArguments extends Record<string, unknown>, TExtra, TResult extends McpToolResult>(server: McpServerLike, name: string, config: TConfig, handler: McpToolHandler<TArguments, TExtra, TResult>, options?: AdapterOptions): unknown;
//# sourceMappingURL=index.d.ts.map