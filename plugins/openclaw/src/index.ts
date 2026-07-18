import {
  buildJsonPluginConfigSchema,
  definePluginEntry,
  type OpenClawPluginApi,
} from 'openclaw/plugin-sdk/plugin-entry'
import {
  AgentGuardClient,
  type ScanResult,
  type TrustLevel,
} from './client.js'

type PluginConfig = {
  baseUrl?: string
  apiKey?: string
  failClosed?: boolean
  scanPrompts?: boolean
  scanToolResults?: boolean
  checkToolCalls?: boolean
  timeoutMs?: number
}

const configJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    baseUrl: { type: 'string', format: 'uri' },
    apiKey: { type: 'string' },
    failClosed: { type: 'boolean', default: true },
    scanPrompts: { type: 'boolean', default: true },
    scanToolResults: { type: 'boolean', default: true },
    checkToolCalls: { type: 'boolean', default: true },
    timeoutMs: {
      type: 'integer',
      minimum: 1000,
      maximum: 60000,
      default: 15000,
    },
  },
} as const

const configSchema = buildJsonPluginConfigSchema(configJsonSchema)
const MAX_SCAN_CHARS = 48_000
const DEFAULT_BASE_URL = 'https://agentguard-jade.vercel.app'

function readConfig(api: OpenClawPluginApi) {
  const input = api.pluginConfig as PluginConfig
  return {
    baseUrl:
      input.baseUrl ||
      process.env.AGENTGUARD_BASE_URL ||
      DEFAULT_BASE_URL,
    apiKey: input.apiKey || process.env.AGENTGUARD_API_KEY,
    failClosed: input.failClosed ?? true,
    scanPrompts: input.scanPrompts ?? true,
    scanToolResults: input.scanToolResults ?? true,
    checkToolCalls: input.checkToolCalls ?? true,
    timeoutMs: input.timeoutMs ?? 15_000,
  }
}

async function scanAll(
  client: AgentGuardClient,
  text: string,
  source: TrustLevel,
): Promise<ScanResult> {
  const chunks = text.match(new RegExp(`.{1,${MAX_SCAN_CHARS}}`, 'gs')) || ['']
  const results: ScanResult[] = []
  for (const chunk of chunks) {
    results.push(await client.scan(chunk, source))
  }
  const highest = results.reduce((current, result) =>
    result.risk > current.risk ? result : current,
  )
  return {
    ...highest,
    blocked: results.some((result) => result.blocked),
    risk: Math.max(...results.map((result) => result.risk)),
    sanitized_text: results.map((result) => result.sanitized_text).join(''),
    findings: results.flatMap((result) => result.findings),
  }
}

function blockedToolResult(
  result: { content: unknown[]; details: unknown },
  message: string,
) {
  return {
    result: {
      ...result,
      content: [{ type: 'text' as const, text: message }],
      terminate: true,
    },
  }
}

export function registerAgentGuard(api: OpenClawPluginApi) {
  const config = readConfig(api)
  const client = new AgentGuardClient(config)

  if (config.scanPrompts) {
    api.on('before_agent_run', async (event) => {
      try {
        const scan = await scanAll(client, event.prompt, 'USER_PROMPT')
        if (!scan.blocked) return { outcome: 'pass' }
        return {
          outcome: 'block',
          reason: scan.policy?.reason || `AgentGuard risk ${scan.risk}`,
          message: `AgentGuard blocked this prompt (${Math.round(scan.risk * 100)}% risk).`,
          category: 'prompt-injection',
          metadata: { risk: scan.risk },
        }
      } catch (error) {
        api.logger.error(`Prompt scan failed: ${error instanceof Error ? error.message : 'unknown error'}`)
        if (!config.failClosed) return { outcome: 'pass' }
        return {
          outcome: 'block',
          reason: 'AgentGuard was unavailable',
          message: 'AgentGuard could not verify this prompt, so the run was blocked.',
          category: 'security-unavailable',
        }
      }
    })
  }

  if (config.checkToolCalls) {
    api.on('before_tool_call', async (event) => {
      try {
        const decision = await client.checkAction({
          name: event.toolName,
          arguments: event.params,
          kind: event.toolKind,
          inputKind: event.toolInputKind,
        })
        if (decision.allowed) return
        return {
          block: true,
          blockReason: `AgentGuard blocked ${event.toolName}: ${decision.reason}`,
        }
      } catch (error) {
        api.logger.error(`Tool-call check failed: ${error instanceof Error ? error.message : 'unknown error'}`)
        if (!config.failClosed) return
        return {
          block: true,
          blockReason: `AgentGuard could not verify ${event.toolName}; blocked fail-closed.`,
        }
      }
    })
  }

  if (config.scanToolResults) {
    api.registerAgentToolResultMiddleware(async (event) => {
      const text = event.result.content
        .filter((part): part is Extract<typeof part, { type: 'text' }> =>
          part.type === 'text',
        )
        .map((part) => part.text)
        .join('\n')
      if (!text.trim()) return

      try {
        const scan = await scanAll(client, text, 'TOOL_OUTPUT')
        if (scan.blocked) {
          return blockedToolResult(
            event.result,
            `[AgentGuard blocked untrusted output from ${event.toolName} at ${Math.round(scan.risk * 100)}% risk.]`,
          )
        }
        const nonText = event.result.content.filter((part) => part.type !== 'text')
        return {
          result: {
            ...event.result,
            content: [
              { type: 'text', text: scan.sanitized_text },
              ...nonText,
            ],
          },
        }
      } catch (error) {
        api.logger.error(`Tool-result scan failed: ${error instanceof Error ? error.message : 'unknown error'}`)
        if (!config.failClosed) return
        return blockedToolResult(
          event.result,
          `[AgentGuard could not verify output from ${event.toolName}; content withheld fail-closed.]`,
        )
      }
    }, { runtimes: ['openclaw', 'codex'] })
  }

  api.logger.info(
    `AgentGuard enabled (${config.baseUrl}; fail-${config.failClosed ? 'closed' : 'open'})`,
  )
}

export default definePluginEntry({
  id: 'agentguard',
  name: 'AgentGuard',
  description: 'Fail-closed prompt, tool-call, and tool-result security.',
  configSchema,
  register: registerAgentGuard,
})
