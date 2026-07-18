import { AgentGuardMiddleware } from "@agentguard/core";
const actionArguments = (input) => input !== null && typeof input === "object" && !Array.isArray(input)
    ? input
    : { input };
/**
 * Wraps a LangChain-compatible tool without importing LangChain at runtime.
 * All properties and methods except `invoke` are delegated to the original tool.
 */
export function wrapLangChainTool(tool, options = {}) {
    const middleware = options.middleware ?? new AgentGuardMiddleware();
    return new Proxy(tool, {
        get(target, property) {
            if (property !== "invoke") {
                const value = Reflect.get(target, property, target);
                return typeof value === "function" ? value.bind(target) : value;
            }
            return async (input, config) => {
                await middleware.beforeTool(target.name, actionArguments(input), options.trustedContext);
                const output = await target.invoke.call(target, input, config);
                return middleware.afterTool(output);
            };
        },
    });
}
/**
 * Wraps a retriever and scans both the query and every returned document.
 */
export function wrapLangChainRetriever(retriever, options = {}) {
    const middleware = options.middleware ?? new AgentGuardMiddleware();
    return new Proxy(retriever, {
        get(target, property) {
            if (property !== "getRelevantDocuments") {
                const value = Reflect.get(target, property, target);
                return typeof value === "function" ? value.bind(target) : value;
            }
            return async (query, config) => {
                await middleware.beforeModel(query, "USER_PROMPT");
                const documents = await target.getRelevantDocuments.call(target, query, config);
                return Promise.all(documents.map(async (document) => ({
                    ...document,
                    pageContent: await middleware.afterTool(document.pageContent, "DOCUMENT"),
                })));
            };
        },
    });
}
export async function guardLangChainResult(result, middleware = new AgentGuardMiddleware()) {
    return middleware.afterTool(result, "TOOL_OUTPUT");
}
//# sourceMappingURL=index.js.map