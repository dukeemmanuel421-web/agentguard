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

export type McpToolHandler<
  TArguments extends Record<string, unknown> = Record<string, unknown>,
  TExtra = unknown,
  TResult extends McpToolResult = McpToolResult,
> = (arguments_: TArguments, extra: TExtra) => TResult | Promise<TResult>;

export interface McpServerLike {
  registerTool<TConfig, THandler>(
    name: string,
    config: TConfig,
    handler: THandler,
  ): unknown;
}

export interface AdapterOptions {
  middleware?: AgentGuardMiddleware;
  trustedContext?: string[];
}

/**
 * Scans text and structured MCP content while preserving all protocol fields.
 */
export async function guardMcpResult<TResult extends McpToolResult>(
  result: TResult,
  middleware = new AgentGuardMiddleware(),
): Promise<TResult> {
  const content = result.content
    ? await Promise.all(
        result.content.map(async (item) =>
          item.type === "text" && typeof item.text === "string"
            ? { ...item, text: await middleware.afterTool(item.text, "MCP_OUTPUT") }
            : item,
        ),
      )
    : undefined;
  const structuredContent = result.structuredContent
    ? await middleware.afterTool(result.structuredContent, "MCP_OUTPUT")
    : undefined;

  return {
    ...result,
    ...(content === undefined ? {} : { content }),
    ...(structuredContent === undefined ? {} : { structuredContent }),
  } as TResult;
}

export function wrapMcpToolHandler<
  TArguments extends Record<string, unknown>,
  TExtra,
  TResult extends McpToolResult,
>(
  name: string,
  handler: McpToolHandler<TArguments, TExtra, TResult>,
  options: AdapterOptions = {},
): McpToolHandler<TArguments, TExtra, TResult> {
  const middleware = options.middleware ?? new AgentGuardMiddleware();
  return async (arguments_, extra) => {
    await middleware.beforeTool(name, arguments_, options.trustedContext);
    return guardMcpResult(await handler(arguments_, extra), middleware);
  };
}

/**
 * Registers a guarded handler on an MCP SDK-compatible server.
 */
export function registerGuardedMcpTool<
  TConfig,
  TArguments extends Record<string, unknown>,
  TExtra,
  TResult extends McpToolResult,
>(
  server: McpServerLike,
  name: string,
  config: TConfig,
  handler: McpToolHandler<TArguments, TExtra, TResult>,
  options: AdapterOptions = {},
): unknown {
  return server.registerTool(name, config, wrapMcpToolHandler(name, handler, options));
}
