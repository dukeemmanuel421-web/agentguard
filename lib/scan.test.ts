import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DetectorResult } from './contracts'

const send = vi.fn()

vi.mock('@/lib/aws', () => ({
  dynamo: { send },
  tables: { scans: undefined },
  secrets: { send: vi.fn() },
}))

const lowRiskDetector: DetectorResult = { risk: 0.05, findings: [], latency_ms: 1 }

vi.mock('@/lib/providers', () => ({
  runDirectDetectorFallback: vi.fn(async () => ({
    llm: lowRiskDetector,
    probe: lowRiskDetector,
    provenance: [
      { provider: 'openai', model: 'test-model', source: 'environment', fallback: true, signal: 'semantic' },
      { provider: 'openai', model: 'test-model', source: 'environment', fallback: true, signal: 'inferred-probe' },
    ],
    errors: [],
  })),
}))

describe('scanText', () => {
  beforeEach(() => {
    send.mockReset()
  })

  it('returns a scan result without requiring a DynamoDB scans table', async () => {
    const { scanText } = await import('./scan')

    const result = await scanText('Summarize this support ticket.', 'USER_PROMPT', 'public')

    expect(result.blocked).toBe(false)
    expect(result.detectors.llm).toEqual(lowRiskDetector)
    expect(send).not.toHaveBeenCalled()
  })
})
