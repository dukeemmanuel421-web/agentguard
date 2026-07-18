# AgentGuard demo video

Target length: **2 minutes 20 seconds**  
Submission limit: **under 3 minutes**

## Shot list and voice-over

### 0:00–0:15 — The problem

**Visual:** AgentGuard hero, then scroll to “Security before context.”

**Voice-over:**

> AI agents read content their developers do not control: web pages,
> documents, tool results, and MCP responses. One hidden prompt injection can
> redirect the agent before output moderation ever sees it. AgentGuard is a
> security boundary for what the model consumes.

### 0:15–0:42 — Run an attack

**Visual:** Show the preloaded prompt override in the live scanner. Click
**Run scan** and reveal the blocked verdict, aggregate risk, and detector rows.

**Voice-over:**

> This page contains an instruction override and a request to exfiltrate
> secrets. Before it enters agent context, I send it to one synchronous scan
> endpoint. AgentGuard runs a fast heuristic, a GPT-5.6 semantic judge, and an
> independent activation-style probe. The active policy combines all three
> signals and blocks the content with inspectable evidence.

### 0:42–0:58 — Compare benign content

**Visual:** Select **Benign support**, run it, and show the allowed verdict.

**Voice-over:**

> The same boundary allows ordinary support content. This is not a keyword-only
> blocker: GPT-5.6 evaluates intent and instruction hierarchy, while the other
> signals provide independent checks.

### 0:58–1:20 — Developer integration

**Visual:** Open **Developers**. Highlight `pip install ./sdk/python`, then the
`AgentGuard().scan(...)` example.

**Voice-over:**

> Integration is intentionally small. The dependency-free Python SDK installs
> with pip. Developers call scan before inserting untrusted text into context,
> or call check-action before an agent executes a tool. The response includes a
> typed verdict, risk score, findings, sanitized text, and policy provenance.

### 1:20–1:40 — Provider and policy control

**Visual:** Open the console. Show **Policies**, then **Providers**, highlighting
GPT-5.6 through OpenAI/OpenRouter and encrypted key storage.

**Voice-over:**

> Teams can publish versioned thresholds and block or allow phrases. GPT-5.6
> runs through OpenAI or OpenRouter, and workspace credentials are encrypted
> before storage. If a mandatory detector fails or returns malformed data,
> AgentGuard fails closed instead of silently bypassing security.

### 1:40–2:02 — Technical implementation

**Visual:** Show the architecture diagram and briefly flash tests or repository
structure.

**Voice-over:**

> The online path is Next.js and TypeScript. AWS adds DynamoDB evidence, S3
> uploads, SQS and Lambda batch scans, Secrets Manager, and a private Fargate
> probe. The Lambda is bundled and tenant-scoped, Vercel uses OIDC rather than
> long-lived AWS credentials, and the repository verifies the app, SDK, and
> infrastructure in CI.

### 2:02–2:20 — GPT-5.6 and Codex

**Visual:** Show the repository README and final live product.

**Voice-over template — verify before recording:**

> GPT-5.6 Sol was the primary coding agent that turned AgentGuard from concept
> into this working MVP, including the scanner, provider routing, Python SDK,
> tests, and deployment hardening. [After completing a real Codex session:
> briefly state the exact feature or review Codex completed.] AgentGuard gives
> every agent developer one clear rule: trust nothing your agent reads.

## Recording notes

- Record at 1920×1080 or 1280×720.
- Keep browser zoom at 100% and hide personal bookmarks and notifications.
- Never display OpenAI, OpenRouter, AWS, Vercel, or PyPI credentials.
- Use the final deployed commit, not a local mock.
- Keep the final export below 2:50 to leave margin under Devpost’s limit.
- Upload as an unlisted or public YouTube video; Devpost requires a public URL.
