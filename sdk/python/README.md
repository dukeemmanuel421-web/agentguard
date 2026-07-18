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
