# @agentguard/core

Dependency-free AgentGuard client and fail-closed middleware for JavaScript runtimes with the Fetch API.

> Package name reserved for publishing; this repository does not claim the package is published.

## Install

```sh
npm install @agentguard/core
```

## Usage

```ts
import { AgentGuard, AgentGuardMiddleware } from "@agentguard/core";

const guard = new AgentGuard({
  apiKey: process.env.AGENTGUARD_API_KEY,
  baseUrl: "https://agentguard.example",
});
const middleware = new AgentGuardMiddleware(guard);

await middleware.beforeModel(userPrompt);
const safeSearch = middleware.wrapTool("search", search);
const result = await safeSearch({ query: userPrompt });
```

`AgentGuardBlockedError` identifies the blocked stage and carries the complete policy decision. Requests retry server and network failures, then fail closed.

## Local development

This package is intentionally independent of a root workspace:

```sh
npm install
npm run check
```
