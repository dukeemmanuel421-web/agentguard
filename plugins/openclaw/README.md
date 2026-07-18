# AgentGuard for OpenClaw

AgentGuard intercepts OpenClaw workflows at three security boundaries:

1. `before_agent_run` scans the user prompt before model ingestion.
2. `before_tool_call` checks proposed tool names and arguments before execution.
3. Agent tool-result middleware scans and sanitizes tool output before OpenClaw
   or Codex returns it to the model.

All boundaries fail closed by default.

## Install from this repository

From the AgentGuard repository root:

```bash
cd plugins/openclaw
pnpm install --frozen-lockfile
pnpm build
pnpm pack

openclaw plugins install npm-pack:./agentguard-openclaw-0.1.0.tgz --force
openclaw plugins enable agentguard
```

For plugin development, link the source directory instead:

```bash
openclaw plugins install --link ./plugins/openclaw
openclaw plugins enable agentguard
```

Restart and verify the running Gateway:

```bash
openclaw gateway restart
openclaw plugins inspect agentguard --runtime --json
```

## Configure

The simplest setup is to provide credentials to the OpenClaw Gateway process:

```bash
export AGENTGUARD_BASE_URL=https://agentguard-jade.vercel.app
export AGENTGUARD_API_KEY=ag_live_...
```

The key is optional for public scans in the MVP but recommended for production
rate limiting and workspace attribution.

Plugin settings can also be placed under `plugins.entries.agentguard.config` in
`openclaw.json`:

```json5
{
  plugins: {
    entries: {
      agentguard: {
        enabled: true,
        config: {
          baseUrl: "https://agentguard-jade.vercel.app",
          apiKey: "ag_live_...",
          failClosed: true,
          scanPrompts: true,
          scanToolResults: true,
          checkToolCalls: true,
          timeoutMs: 15000
        }
      }
    }
  }
}
```

Prefer an environment variable or OpenClaw secret reference over committing an
API key to a configuration file.

## Behavior

- Unsafe prompts stop the run before the model receives them.
- Unsafe tool calls return an OpenClaw `block` decision.
- Unsafe tool output is replaced with a short security notice and terminates
  the current tool batch.
- Allowed tool output has invisible control characters removed using
  AgentGuard's `sanitized_text`.
- Inputs over 48,000 characters are scanned in bounded sequential chunks.
- If AgentGuard times out or returns an error, the operation is blocked unless
  `failClosed` is explicitly disabled.

## Supported versions

- OpenClaw `2026.7.1` or newer
- OpenClaw and Codex agent tool-result runtimes
- Node.js versions supported by the installed OpenClaw release

The npm package is prepared but not published yet. Until it is published, use
the local `npm-pack:` or `--link` installation above.
