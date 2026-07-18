import { AgentGuardMiddleware } from "@agentguard/core";
export interface LangChainToolLike<TInput = unknown, TOutput = unknown, TConfig = unknown> {
    name: string;
    invoke(input: TInput, config?: TConfig): TOutput | Promise<TOutput>;
}
export interface LangChainDocumentLike {
    pageContent: string;
    [key: string]: unknown;
}
export interface LangChainRetrieverLike<TDocument extends LangChainDocumentLike = LangChainDocumentLike, TConfig = unknown> {
    getRelevantDocuments(query: string, config?: TConfig): TDocument[] | Promise<TDocument[]>;
}
export interface AdapterOptions {
    middleware?: AgentGuardMiddleware;
    trustedContext?: string[];
}
/**
 * Wraps a LangChain-compatible tool without importing LangChain at runtime.
 * All properties and methods except `invoke` are delegated to the original tool.
 */
export declare function wrapLangChainTool<TInput, TOutput, TConfig, TTool extends LangChainToolLike<TInput, TOutput, TConfig>>(tool: TTool, options?: AdapterOptions): TTool;
/**
 * Wraps a retriever and scans both the query and every returned document.
 */
export declare function wrapLangChainRetriever<TDocument extends LangChainDocumentLike, TConfig, TRetriever extends LangChainRetrieverLike<TDocument, TConfig>>(retriever: TRetriever, options?: AdapterOptions): TRetriever;
export declare function guardLangChainResult<T>(result: T, middleware?: AgentGuardMiddleware): Promise<T>;
//# sourceMappingURL=index.d.ts.map