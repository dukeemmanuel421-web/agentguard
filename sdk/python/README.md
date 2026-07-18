# AgentGuard Python SDK

Install the client from this repository:

```bash
pip install ./sdk/python
```

Then point it at your AgentGuard deployment:

```bash
export AGENTGUARD_BASE_URL=http://localhost:3000
```

```python
from agentguard import AgentGuard

guard = AgentGuard()
result = guard.scan("Summarize this document.", source="DOCUMENT")
print(result["blocked"], result["risk"])
```

`scan` and `check_action` work with the public MVP. Set
`AGENTGUARD_API_KEY` to use uploads, batch scans, and job status endpoints.

## Framework-neutral agent middleware

Use `AgentGuardMiddleware` around any agent loop, regardless of framework:

```python
from agentguard import AgentGuardMiddleware

guard = AgentGuardMiddleware()

# Before sending user or retrieved content to a model:
guard.before_model(user_input, source="USER_PROMPT")

# Wrap any sync or async tool with pre-call and post-result gates:
@guard.wrap_tool
def web_search(query: str) -> str:
    return search_provider(query)
```

The same three boundaries map to LangChain tools, CrewAI tools, AutoGen
functions, OpenAI Agents tools, custom agent loops, and MCP client calls:

- `before_model(...)` scans prompts and retrieved context.
- `before_tool(...)` checks proposed names and arguments before side effects.
- `after_tool(...)` scans and sanitizes untrusted output.
- `wrap_tool(...)` combines both tool boundaries as a decorator.

Async equivalents (`abefore_model`, `abefore_tool`, and `aafter_tool`) avoid
blocking an async agent loop while the HTTP security decision runs.
