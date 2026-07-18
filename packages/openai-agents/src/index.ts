import { AgentGuardMiddleware } from "@agentguard/core";

export interface OpenAIAgentsToolLike<
  TContext = unknown,
  TInput = unknown,
  TOutput = unknown,
  TInvokeDetails extends unknown[] = unknown[],
> {
  name: string;
  invoke(
    context: TContext,
    input: TInput,
    ...details: TInvokeDetails
  ): TOutput | Promise<TOutput>;
}

export interface OpenAIAgentsRunResultLike<TOutput = unknown> {
  finalOutput?: TOutput;
  [key: string]: unknown;
}

export interface AdapterOptions {
  middleware?: AgentGuardMiddleware;
  trustedContext?: string[];
}

const actionArguments = (input: unknown): Record<string, unknown> => {
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input) as unknown;
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Plain string tool inputs are valid.
    }
  }
  return { input };
};

/**
 * Wraps an OpenAI Agents function tool while retaining its SDK-specific fields.
 * No import from `@openai/agents` is needed at runtime.
 */
export function wrapOpenAIAgentsTool<
  TContext,
  TInput,
  TOutput,
  TInvokeDetails extends unknown[],
  TTool extends OpenAIAgentsToolLike<TContext, TInput, TOutput, TInvokeDetails>,
>(tool: TTool, options: AdapterOptions = {}): TTool {
  const middleware = options.middleware ?? new AgentGuardMiddleware();
  return new Proxy(tool, {
    get(target, property) {
      if (property !== "invoke") {
        const value = Reflect.get(target, property, target) as unknown;
        return typeof value === "function" ? value.bind(target) : value;
      }
      return async (
        context: TContext,
        input: TInput,
        ...details: TInvokeDetails
      ): Promise<TOutput> => {
        await middleware.beforeTool(target.name, actionArguments(input), options.trustedContext);
        return middleware.afterTool(await target.invoke.call(target, context, input, ...details));
      };
    },
  });
}

export async function guardOpenAIAgentsInput<T>(
  input: T,
  middleware = new AgentGuardMiddleware(),
): Promise<T> {
  return middleware.guardModelInput(input, "USER_PROMPT");
}

/**
 * Returns a result with a guarded `finalOutput`, preserving the original prototype.
 */
export async function guardOpenAIAgentsResult<
  TOutput,
  TResult extends OpenAIAgentsRunResultLike<TOutput>,
>(result: TResult, middleware = new AgentGuardMiddleware()): Promise<TResult> {
  if (!Object.hasOwn(result, "finalOutput")) return result;
  const finalOutput = await middleware.afterTool(result.finalOutput, "TOOL_OUTPUT");
  return Object.assign(Object.create(Object.getPrototypeOf(result)) as TResult, result, {
    finalOutput,
  });
}
