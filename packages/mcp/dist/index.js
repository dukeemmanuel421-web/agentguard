import { AgentGuardMiddleware } from "@agentguard/core";
/**
 * Scans text and structured MCP content while preserving all protocol fields.
 */
export async function guardMcpResult(result, middleware = new AgentGuardMiddleware()) {
    const content = result.content
        ? await Promise.all(result.content.map(async (item) => item.type === "text" && typeof item.text === "string"
            ? { ...item, text: await middleware.afterTool(item.text, "MCP_OUTPUT") }
            : item))
        : undefined;
    const structuredContent = result.structuredContent
        ? await middleware.afterTool(result.structuredContent, "MCP_OUTPUT")
        : undefined;
    return {
        ...result,
        ...(content === undefined ? {} : { content }),
        ...(structuredContent === undefined ? {} : { structuredContent }),
    };
}
export function wrapMcpToolHandler(name, handler, options = {}) {
    const middleware = options.middleware ?? new AgentGuardMiddleware();
    return async (arguments_, extra) => {
        await middleware.beforeTool(name, arguments_, options.trustedContext);
        return guardMcpResult(await handler(arguments_, extra), middleware);
    };
}
/**
 * Registers a guarded handler on an MCP SDK-compatible server.
 */
export function registerGuardedMcpTool(server, name, config, handler, options = {}) {
    return server.registerTool(name, config, wrapMcpToolHandler(name, handler, options));
}
//# sourceMappingURL=index.js.map