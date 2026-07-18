import { describe, expect, it, vi } from 'vitest'
import type { ScanResult } from './contracts'

const scanText = vi.fn()
vi.mock('@/lib/scan', () => ({ scanText }))

function result(risk: number, blocked = false, snippet = ''): ScanResult {
  const finding = snippet
    ? [{ detector: 'heuristic', severity: 'high' as const, snippet, reason: 'test finding' }]
    : []
  const detectorFinding = snippet
    ? [{ severity: 'high' as const, snippet, reason: 'test finding' }]
    : []
  return {
    blocked,
    risk,
    sanitized_text: 'ignored during aggregation',
    detectors: {
      heuristic: { risk, findings: detectorFinding, latency_ms: 1 },
      llm: { risk, findings: [], latency_ms: 2 },
      probe: { risk, findings: [], latency_ms: 3 },
    },
    findings: finding,
    policy: { id: 'default', name: 'Default', version: 1, threshold: .62, reason: 'test' },
  }
}

describe('scanDocument', () => {
  it('uses the existing scan unchanged for a short document', async () => {
    scanText.mockResolvedValueOnce(result(.1))
    const { scanDocument } = await import('./scan-document')

    const output = await scanDocument('short document', 'DOCUMENT', 'owner')

    expect(scanText).toHaveBeenCalledWith('short document', 'DOCUMENT', 'owner')
    expect(output).toMatchObject({ blocked: false, risk: .1, document: { characters: 14, chunks_scanned: 1 } })
  })

  it('reports verdict-free progress and finds content crossing a chunk boundary', async () => {
    scanText.mockImplementation(async (text: string) =>
      text.includes('boundary attack') ? result(.94, true, 'boundary attack') : result(.05)
    )
    const { scanDocument } = await import('./scan-document')
    const text = `${'x'.repeat(49_990)}boundary attack${'y'.repeat(10)}`
    const progress: unknown[] = []

    const output = await scanDocument(text, 'DOCUMENT', 'owner', event => { progress.push(event) })

    expect(output.blocked).toBe(true)
    expect(output.risk).toBe(.94)
    expect(output.document.chunks_scanned).toBe(2)
    expect(progress).toHaveLength(3)
    expect(progress.every(event => !('blocked' in (event as object)) && !('risk' in (event as object)))).toBe(true)
  })

  it('deduplicates overlap findings and never averages risk down', async () => {
    scanText
      .mockResolvedValueOnce(result(.9, true, 'repeated'))
      .mockResolvedValueOnce(result(.1, false, 'repeated'))
    const { scanDocument } = await import('./scan-document')

    const output = await scanDocument('x'.repeat(50_001))

    expect(output.risk).toBe(.9)
    expect(output.blocked).toBe(true)
    expect(output.findings).toHaveLength(1)
    expect(output.detectors.heuristic.findings).toHaveLength(1)
  })
})
