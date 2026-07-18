export type TrustLevel =
  | 'USER_PROMPT'
  | 'TRUSTED_TOOL'
  | 'TOOL_OUTPUT'
  | 'WEB_PAGE'
  | 'DOCUMENT'
  | 'MCP_OUTPUT'
  | 'UNKNOWN'

export type Finding = {
  detector: string
  severity: string
  snippet: string
  reason: string
}

export type ScanResult = {
  blocked: boolean
  risk: number
  sanitized_text: string
  findings: Finding[]
  policy?: { name: string; version: number; reason: string }
}

export type ActionResult = {
  allowed: boolean
  risk: number
  reason: string
  findings: Finding[]
}

export type ClientOptions = {
  baseUrl: string
  apiKey?: string
  timeoutMs: number
}

export class AgentGuardRequestError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
  }
}

export class AgentGuardClient {
  private readonly baseUrl: string

  constructor(private readonly options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
  }

  scan(text: string, source: TrustLevel): Promise<ScanResult> {
    return this.request('/api/v1/scan', { text, source })
  }

  checkAction(toolCall: Record<string, unknown>): Promise<ActionResult> {
    return this.request('/api/v1/check-action', {
      tool_call: toolCall,
      reasoning_trace: [],
      trusted_context: [],
    })
  }

  private async request<T>(path: string, payload: unknown): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs)
    try {
      const headers: Record<string, string> = {
        accept: 'application/json',
        'content-type': 'application/json',
      }
      if (this.options.apiKey) {
        headers.authorization = `Bearer ${this.options.apiKey}`
      }
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      const body = await response.json().catch(() => undefined) as
        | { error?: string }
        | undefined
      if (!response.ok) {
        throw new AgentGuardRequestError(
          body?.error || `AgentGuard returned ${response.status}`,
          response.status,
        )
      }
      return body as T
    } catch (error) {
      if (error instanceof AgentGuardRequestError) throw error
      if ((error as { name?: string }).name === 'AbortError') {
        throw new AgentGuardRequestError(
          `AgentGuard timed out after ${this.options.timeoutMs}ms`,
        )
      }
      throw new AgentGuardRequestError(
        error instanceof Error ? error.message : 'AgentGuard request failed',
      )
    } finally {
      clearTimeout(timer)
    }
  }
}
