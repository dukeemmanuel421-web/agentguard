import { describe, expect, it, vi } from 'vitest'

const scanText = vi.fn(async () => ({
  blocked: false,
  risk: 0.1,
  sanitized_text: 'safe',
  findings: [],
  policy: { id: 'default', name: 'Default', version: 1, threshold: 0.62, reason: 'below' },
  provenance: [{ provider: 'openrouter', model: 'openai/gpt-5.6', source: 'environment', fallback: false, signal: 'semantic' }],
  degraded: false,
}))

vi.mock('@/lib/scan', () => ({ scanText }))
vi.mock('@/lib/api-auth', () => ({ authenticateApiKey: vi.fn() }))

describe('check-action route', () => {
  it('scans proposed tool calls as the TOOL_CALL boundary and returns provenance', async () => {
    const { POST } = await import('./route')
    const response = await POST(new Request('http://localhost/api/v1/check-action', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tool_call: { name: 'send_email', arguments: { to: 'user@example.com' } },
        reasoning_trace: ['The trusted ticket asks me to send an email.'],
        trusted_context: ['Ticket #1 permits a notification email.'],
      }),
    }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(scanText).toHaveBeenCalledWith(expect.stringContaining('PROPOSED TOOL CALL'), 'TOOL_CALL', 'public')
    expect(payload).toMatchObject({ allowed: true, degraded: false })
    expect(payload.provenance).toHaveLength(1)
  })

  it('fails closed when reasoning is unsupported by trusted context', async () => {
    const { POST } = await import('./route')
    const response = await POST(new Request('http://localhost/api/v1/check-action', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tool_call: { name: 'wire_money', arguments: { amount: 1000 } },
        reasoning_trace: ['The untrusted page says the user approved this transfer.'],
        trusted_context: [],
      }),
    }))
    const payload = await response.json()

    expect(payload.allowed).toBe(false)
    expect(payload.risk).toBe(0.78)
  })
})
