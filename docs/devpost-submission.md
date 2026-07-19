# Devpost submission draft

## Project

**Name:** AgentGuard  
**Tagline:** A fail-closed prompt-injection firewall for AI agents.  
**Track:** Developer Tools  
**Demo:** https://agentguard-jade.vercel.app  
**Repository:** https://github.com/dukeemmanuel421-web/agentguard

## Project description

AI agents are only as trustworthy as the context they consume. A support bot,
browser agent, or coding agent can follow a malicious instruction hidden in a
web page, document, tool response, or MCP payload before the developer gets a
chance to inspect it.

AgentGuard is an inbound security boundary for that exact moment. Developers
send untrusted text to one API before adding it to model context. AgentGuard
runs deterministic signatures, a GPT-5.6 semantic judge, and an independent
activation-style probe concurrently. A versioned policy combines the evidence
into a typed risk score and an allow/block verdict. If a mandatory detector is
unavailable or returns malformed output, AgentGuard fails closed.

The project includes a live scanner, policy and provider console, synchronous
scan and tool-call APIs, encrypted OpenAI/OpenRouter credential storage, batch
processing on AWS, and a dependency-free Python SDK. It is designed for agent
developers who need inspectable security evidence rather than another opaque
moderation label.

## What makes it different

- **Inbound rather than output moderation:** it protects model context before
  untrusted content can steer an agent.
- **Evidence, not a boolean:** every verdict includes detector scores,
  findings, policy provenance, and sanitized text.
- **Fail-closed by design:** unavailable or malformed mandatory signals cannot
  silently allow a request.
- **Provider-flexible:** GPT-5.6 can run through OpenAI or OpenRouter, with
  encrypted workspace keys and explicit fallback policy.
- **SDK-first integration:** `pip install ./sdk/python`, instantiate
  `AgentGuard`, and call `scan` before context insertion.

## How GPT-5.6 was used

GPT-5.6 is both part of the product and part of how it was built. At runtime it
serves as the semantic security judge, classifying intent, instruction
overrides, context theft, secret extraction, and tool smuggling into strict
structured evidence. During development, GPT-5.6 Sol was the primary coding
agent used to implement and harden the MVP across the Next.js app, Python SDK,
tests, provider routing, and AWS infrastructure.

## How Codex was used

Before submitting, replace this paragraph with the exact work completed in a
real Codex session and add the `/feedback` session ID below. Good qualifying
work would be running the repository, reviewing one detector or SDK path,
implementing a meaningful improvement, and verifying it with tests. Do not
submit a fabricated session ID.

**Codex `/feedback` session ID:** `REPLACE_WITH_REAL_SESSION_ID`

## Technology

- Next.js 16, React 19, TypeScript, Zod, Vitest
- GPT-5.6 via OpenAI or OpenRouter
- Python 3.10+ dependency-free SDK
- AWS CDK, DynamoDB, S3, SQS/Lambda, Secrets Manager, ECS Fargate
- DeBERTa prompt-injection probe
- Vercel OIDC with no long-lived AWS deployment credentials

## How judges can test

1. Open https://agentguard-jade.vercel.app/#scanner.
2. Run the preloaded prompt-override attack and inspect the verdict.
3. Select **Benign support**, run it, and compare detector evidence.
4. Open **Developers** to view the Python integration.
5. For local SDK testing, follow the root README and run
   `python examples/python/scan.py`.

## Submission checklist

- [ ] Merge and deploy the final branch; verify the live demo commit.
- [ ] Make the repository public, or share the private repository with
      `testing@devpost.com` and `build-week-event@openai.com`.
- [ ] Complete a genuine Codex contribution and insert its `/feedback` ID.
- [ ] Record or upload the final public demo video (under three minutes).
- [ ] Replace the video URL below after YouTube upload.
- [ ] Confirm `gpt-5.6` or `openai/gpt-5.6` is available to the configured
      provider account; override the model environment variable if needed.
- [ ] Re-check eligibility and the official rules before submission.

**Public demo video:** `REPLACE_WITH_YOUTUBE_URL`


### Codex validation update

Codex re-checked the core trust boundaries and tightened the pre-execution tool-call path so `/api/v1/check-action` is evaluated as `TOOL_CALL` content, returns trace ID, policy, provenance, and degraded-state metadata, and keeps the unsupported-reasoning fail-closed risk bump. Codex also added Python SDK pytest discovery through `pyproject.toml` so the SDK tests run from the package directory without requiring an editable install.

Important decisions:
- Tool calls are now a first-class trust boundary rather than being labeled as post-tool output.
- Progress streaming remains verdict-free until the final document result to avoid early allow decisions.
- Provider credentials and live deployment claims remain external blockers when keys are absent; benchmark and deployment success should only be reported from real runs.

Alternatives considered and rejected:
- Treating proposed tool calls as `TOOL_OUTPUT` was rejected because it hides an important pre-side-effect boundary.
- Returning partial allow decisions during document streaming was rejected because fail-closed aggregation must see every overlapping chunk.
