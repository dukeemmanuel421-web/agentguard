import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgentGuardClient, AgentGuardRequestError } from './client.js'

describe('AgentGuardClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends authenticated scan requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      blocked: false,
      risk: 0.1,
      sanitized_text: 'safe',
      findings: [],
    }), { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const client = new AgentGuardClient({
      baseUrl: 'https://guard.example/',
      apiKey: 'ag_live_test',
      timeoutMs: 1000,
    })

    await client.scan('safe', 'TOOL_OUTPUT')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://guard.example/api/v1/scan',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer ag_live_test',
        }),
      }),
    )
  })

  it('returns useful API errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'Detector unavailable' }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    )))
    const client = new AgentGuardClient({
      baseUrl: 'https://guard.example',
      timeoutMs: 1000,
    })

    await expect(client.scan('test', 'UNKNOWN')).rejects.toEqual(
      expect.objectContaining<Partial<AgentGuardRequestError>>({
        message: 'Detector unavailable',
        status: 503,
      }),
    )
  })
})
