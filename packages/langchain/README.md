# @agentguard/langchain

First-party AgentGuard wrappers for LangChain.js-compatible tools, retrievers, and results.

> Publish-ready package name; this repository does not claim the package is published.

The adapter uses structural interfaces and has no runtime dependency on LangChain. It works with current tool objects exposing `name` and `invoke`, and retrievers exposing `getRelevantDocuments`.

```sh
npm install @agentguard/core @agentguard/langchain
```

```ts
import { AgentGuard, AgentGuardMiddleware } from "@agentguard/core";
import { wrapLangChainRetriever, wrapLangChainTool } from "@agentguard/langchain";

const middleware = new AgentGuardMiddleware(
  new AgentGuard({ apiKey: process.env.AGENTGUARD_API_KEY }),
);

const guardedSearch = wrapLangChainTool(searchTool, { middleware });
const guardedRetriever = wrapLangChainRetriever(retriever, { middleware });

await guardedSearch.invoke({ query: "latest release" });
await guardedRetriever.getRelevantDocuments("deployment guide");
```

Tool arguments are checked before execution and outputs are scanned afterward. Retriever queries are guarded as user input, and each document is scanned with `DOCUMENT` trust.

## Local development

Build `../core` first, then run:

```sh
npm install
npm run check
```
