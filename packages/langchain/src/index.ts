import { AgentGuardMiddleware } from "@agentguard/core";

export interface LangChainToolLike<TInput = unknown, TOutput = unknown, TConfig = unknown> {
  name: string;
  invoke(input: TInput, config?: TConfig): TOutput | Promise<TOutput>;
}

export interface LangChainDocumentLike {
  pageContent: string;
  [key: string]: unknown;
}

export interface LangChainRetrieverLike<
  TDocument extends LangChainDocumentLike = LangChainDocumentLike,
  TConfig = unknown,
> {
  getRelevantDocuments(query: string, config?: TConfig): TDocument[] | Promise<TDocument[]>;
}

export interface AdapterOptions {
  middleware?: AgentGuardMiddleware;
  trustedContext?: string[];
}

const actionArguments = (input: unknown): Record<string, unknown> =>
  input !== null && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : { input };

/**
 * Wraps a LangChain-compatible tool without importing LangChain at runtime.
 * All properties and methods except `invoke` are delegated to the original tool.
 */
export function wrapLangChainTool<
  TInput,
  TOutput,
  TConfig,
  TTool extends LangChainToolLike<TInput, TOutput, TConfig>,
>(tool: TTool, options: AdapterOptions = {}): TTool {
  const middleware = options.middleware ?? new AgentGuardMiddleware();
  return new Proxy(tool, {
    get(target, property) {
      if (property !== "invoke") {
        const value = Reflect.get(target, property, target) as unknown;
        return typeof value === "function" ? value.bind(target) : value;
      }
      return async (input: TInput, config?: TConfig): Promise<TOutput> => {
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
export function wrapLangChainRetriever<
  TDocument extends LangChainDocumentLike,
  TConfig,
  TRetriever extends LangChainRetrieverLike<TDocument, TConfig>,
>(retriever: TRetriever, options: AdapterOptions = {}): TRetriever {
  const middleware = options.middleware ?? new AgentGuardMiddleware();
  return new Proxy(retriever, {
    get(target, property) {
      if (property !== "getRelevantDocuments") {
        const value = Reflect.get(target, property, target) as unknown;
        return typeof value === "function" ? value.bind(target) : value;
      }
      return async (query: string, config?: TConfig): Promise<TDocument[]> => {
        await middleware.beforeModel(query, "USER_PROMPT");
        const documents = await target.getRelevantDocuments.call(target, query, config);
        return Promise.all(
          documents.map(async (document) => ({
            ...document,
            pageContent: await middleware.afterTool(document.pageContent, "DOCUMENT"),
          })),
        ) as Promise<TDocument[]>;
      };
    },
  });
}

export async function guardLangChainResult<T>(
  result: T,
  middleware = new AgentGuardMiddleware(),
): Promise<T> {
  return middleware.afterTool(result, "TOOL_OUTPUT");
}
