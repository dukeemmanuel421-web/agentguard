import { AgentGuardMiddleware } from "@agentguard/core";
const actionArguments = (input) => {
    if (input !== null && typeof input === "object" && !Array.isArray(input)) {
        return input;
    }
    if (typeof input === "string") {
        try {
            const parsed = JSON.parse(input);
            if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
                return parsed;
            }
        }
        catch {
            // Plain string tool inputs are valid.
        }
    }
    return { input };
};
/**
 * Wraps an OpenAI Agents function tool while retaining its SDK-specific fields.
 * No import from `@openai/agents` is needed at runtime.
 */
export function wrapOpenAIAgentsTool(tool, options = {}) {
    const middleware = options.middleware ?? new AgentGuardMiddleware();
    return new Proxy(tool, {
        get(target, property) {
            if (property !== "invoke") {
                const value = Reflect.get(target, property, target);
                return typeof value === "function" ? value.bind(target) : value;
            }
            return async (context, input, ...details) => {
                await middleware.beforeTool(target.name, actionArguments(input), options.trustedContext);
                return middleware.afterTool(await target.invoke.call(target, context, input, ...details));
            };
        },
    });
}
export async function guardOpenAIAgentsInput(input, middleware = new AgentGuardMiddleware()) {
    return middleware.guardModelInput(input, "USER_PROMPT");
}
/**
 * Returns a result with a guarded `finalOutput`, preserving the original prototype.
 */
export async function guardOpenAIAgentsResult(result, middleware = new AgentGuardMiddleware()) {
    if (!Object.hasOwn(result, "finalOutput"))
        return result;
    const finalOutput = await middleware.afterTool(result.finalOutput, "TOOL_OUTPUT");
    return Object.assign(Object.create(Object.getPrototypeOf(result)), result, {
        finalOutput,
    });
}
//# sourceMappingURL=index.js.map