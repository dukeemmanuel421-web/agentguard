# @agentguard/mcp

First-party AgentGuard wrappers for Model Context Protocol tool handlers, servers, and results.

> Publish-ready package name; this repository does not claim the package is published.

The adapter uses protocol-shaped interfaces and does not import an MCP SDK at runtime.

```sh
npm install @agentguard/core @agentguard/mcp
```

```ts
import { AgentGuard, AgentGuardMiddleware } from "@agentguard/core";
import { registerGuardedMcpTool } from "@agentguard/mcp";

const middleware = new AgentGuardMiddleware(
  new AgentGuard({ apiKey: process.env.AGENTGUARD_API_KEY }),
);

registerGuardedMcpTool(
  server,
  "lookup",
  { description: "Look up a record", inputSchema },
  async ({ id }) => ({
    content: [{ type: "text", text: await lookup(id) }],
  }),
  { middleware },
);
```

Arguments are checked before handler execution. Text and structured results are scanned with `MCP_OUTPUT` trust; binary and other non-text content is preserved.

## Local development

Build `../core` first, then run:

```sh
npm install
npm run check
```
