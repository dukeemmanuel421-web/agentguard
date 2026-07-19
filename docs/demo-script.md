AI agents read untrusted web pages, documents, MCP responses, and tool output. A hidden instruction can redirect an agent before output moderation sees it. AgentGuard protects what the model consumes.

Here is a live injection asking the agent to ignore its rules and expose secrets. AgentGuard runs deterministic checks, a GPT-5.6 judge through OpenRouter, and an adversarial probe. The policy blocks it with risk, findings, provenance, and sanitized text.

Now I run a normal support request. AgentGuard allows it with low risk. GPT-5.6 evaluates intent and instruction hierarchy, so this is more than keyword filtering.

Developers can integrate through SDKs, REST, agent frameworks, MCP, or OpenClaw. AgentGuard gates content before the model, tools before side effects, and results before they return to context. Large documents use overlapping chunks; streaming never issues an early allow verdict.

The console provides policies, optional authentication, encrypted provider keys, signed webhooks, tracing, and a reproducible benchmark. Failures remain fail-closed.

GPT-5.6 Sol helped build and harden this MVP. In a separate Codex session, Codex validated the architecture, made TOOL_CALL a first-class boundary, strengthened action checks, exposed provenance and degraded-state metadata, and added regression tests. AgentGuard gives developers one clear rule: trust nothing your agent reads.
