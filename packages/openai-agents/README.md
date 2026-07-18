# @agentguard/openai-agents

First-party AgentGuard wrappers for OpenAI Agents SDK-compatible tools, inputs, and run results.

> Publish-ready package name; this repository does not claim the package is published.

The package uses structural interfaces. Importing it does not load or require `@openai/agents`.

```sh
npm install @agentguard/core @agentguard/openai-agents
```

```ts
import { AgentGuard, AgentGuardMiddleware } from "@agentguard/core";
import {
  guardOpenAIAgentsInput,
  guardOpenAIAgentsResult,
  wrapOpenAIAgentsTool,
} from "@agentguard/openai-agents";

const middleware = new AgentGuardMiddleware(
  new AgentGuard({ apiKey: process.env.AGENTGUARD_API_KEY }),
);

const guardedTools = tools.map((tool) => wrapOpenAIAgentsTool(tool, { middleware }));
const safeInput = await guardOpenAIAgentsInput(input, middleware);
const result = await run(agent, safeInput, { context, tools: guardedTools });
const safeResult = await guardOpenAIAgentsResult(result, middleware);
```

JSON string arguments are decoded for action policy checks. Tool and final outputs are scanned and can be sanitized before being returned.

## Local development

Build `../core` first, then run:

```sh
npm install
npm run check
```
