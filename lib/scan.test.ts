import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DetectorResult } from './contracts'

const send = vi.fn()

vi.mock('@/lib/aws', () => ({
  dynamo: { send },
  tables: { scans: undefined },
  secrets: { send: vi.fn() },
}))

const lowRiskDetector: DetectorResult = { risk: 0.05, findings: [], latency_ms: 1 }

vi.mock('@/lib/providers', () => ({
  getProviderSettings: vi.fn(async () => ({ mode: 'auto' })),
  runDirectDetectorFallback: vi.fn(async () => ({
    llm: lowRiskDetector,
    probe: lowRiskDetector,
    provenance: [
      { provider: 'openai', model: 'test-model', source: 'environment', fallback: true, signal: 'semantic' },
      { provider: 'openai', model: 'test-model', source: 'environment', fallback: true, signal: 'inferred-probe' },
    ],
    errors: [],
  })),
  runDirectSemanticDetector: vi.fn(async () => ({
    llm: lowRiskDetector,
    provenance: { provider: 'openrouter', model: 'test-model', source: 'environment', fallback: false, signal: 'semantic' },
    errors: [],
  })),
}))

describe('scanText', () => {
  beforeEach(() => {
    send.mockReset()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('returns a scan result without requiring a DynamoDB scans table', async () => {
    const { scanText } = await import('./scan')

    const result = await scanText('Summarize this support ticket.', 'USER_PROMPT', 'public')

    expect(result.blocked).toBe(false)
    expect(result.detectors.llm).toEqual(lowRiskDetector)
    expect(send).not.toHaveBeenCalled()
  })

  it('combines a direct semantic judge with the real activation probe', async () => {
    vi.stubEnv('PROBE_SERVICE_URL', 'https://probe.example/')
    vi.stubEnv('PROBE_SERVICE_TOKEN', 'probe-token')
    const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({
      risk: .12,
      rationale: 'DeBERTa classified the content as safe.',
      findings: [],
    }),{status:200,headers:{'content-type':'application/json'}}))
    vi.stubGlobal('fetch',fetchMock)
    const { scanText } = await import('./scan')

    const result = await scanText('Summarize this support ticket.', 'USER_PROMPT', 'public')

    expect(fetchMock).toHaveBeenCalledWith('https://probe.example/probe',expect.objectContaining({
      headers:expect.objectContaining({authorization:'Bearer probe-token'}),
    }))
    expect(result.provenance?.map(item=>item.signal)).toEqual(['semantic','activation-probe'])
    expect(result.degraded).toBe(false)
  })
})
