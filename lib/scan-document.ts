import { chunkDocument, type DocumentChunk } from '@/lib/chunking'
import type { DetectorResult, Finding, ScanResult, TrustLevel } from '@/lib/contracts'
import { MAX_DOCUMENT_TEXT_LENGTH } from '@/lib/limits'
import { scanText } from '@/lib/scan'
import { sanitizeText } from '@/lib/detectors/heuristic'

export type DocumentScanProgress = {
  type: 'progress'
  completed_chunks: number
  total_chunks: number
  scanned_characters: number
  total_characters: number
}

export type DocumentScanResult = ScanResult & {
  document: {
    characters: number
    chunks_scanned: number
  }
}

type ScannedChunk = { chunk: DocumentChunk; result: ScanResult }

function aggregateDetector(results: DetectorResult[]): DetectorResult {
  const highest = results.reduce((best, result) => result.risk > best.risk ? result : best)
  return {
    risk: highest.risk,
    findings: deduplicate(results.flatMap(result => result.findings)),
    ...(highest.rationale ? { rationale: highest.rationale } : {}),
    ...(highest.model ? { model: highest.model } : {}),
    latency_ms: results.reduce((total, result) => total + (result.latency_ms ?? 0), 0),
  }
}

function deduplicate<T extends { severity: string; snippet: string; reason: string }>(findings: T[]): T[] {
  const seen = new Set<string>()
  return findings.filter(finding => {
    const key = `${finding.severity}\0${finding.snippet}\0${finding.reason}\0${'detector' in finding ? finding.detector : ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Aggregate overlapping scans without averaging risk down or counting the
 * overlap more than once. One blocked chunk always blocks the document.
 */
export function aggregateDocumentScans(text: string, scans: ScannedChunk[]): DocumentScanResult {
  if (!scans.length) throw new Error('At least one scanned chunk is required.')
  const results = scans.map(scan => scan.result)
  const highest = results.reduce((best, result) => result.risk > best.risk ? result : best)
  const blockedCount = results.filter(result => result.blocked).length
  const provenance = results.flatMap(result => result.provenance ?? []).filter((item, index, all) =>
    all.findIndex(candidate =>
      candidate.provider === item.provider &&
      candidate.model === item.model &&
      candidate.source === item.source &&
      candidate.signal === item.signal
    ) === index
  )

  return {
    blocked: blockedCount > 0,
    risk: highest.risk,
    sanitized_text: sanitizeText(text),
    detectors: {
      heuristic: aggregateDetector(results.map(result => result.detectors.heuristic)),
      llm: aggregateDetector(results.map(result => result.detectors.llm)),
      probe: aggregateDetector(results.map(result => result.detectors.probe)),
    },
    findings: deduplicate(results.flatMap(result => result.findings)) as Finding[],
    policy: {
      ...highest.policy,
      threshold: Math.min(...results.map(result => result.policy.threshold)),
      reason: blockedCount
        ? `${blockedCount} of ${results.length} document chunks were blocked.`
        : `All ${results.length} document chunks were below their policy thresholds.`,
    },
    ...(provenance.length ? { provenance } : {}),
    degraded: results.some(result => result.degraded),
    document: { characters: text.length, chunks_scanned: scans.length },
  }
}

export async function scanDocument(
  text: string,
  source: TrustLevel = 'DOCUMENT',
  ownerId = 'public',
  onProgress?: (progress: DocumentScanProgress) => void | Promise<void>,
): Promise<DocumentScanResult> {
  if (!text.trim() || text.length > MAX_DOCUMENT_TEXT_LENGTH) {
    throw new Error(`Document must contain 1–${MAX_DOCUMENT_TEXT_LENGTH.toLocaleString('en-US')} characters.`)
  }
  const chunks = chunkDocument(text)
  const scans: ScannedChunk[] = []

  await onProgress?.({
    type: 'progress',
    completed_chunks: 0,
    total_chunks: chunks.length,
    scanned_characters: 0,
    total_characters: text.length,
  })
  for (const chunk of chunks) {
    scans.push({ chunk, result: await scanText(chunk.text, source, ownerId) })
    await onProgress?.({
      type: 'progress',
      completed_chunks: scans.length,
      total_chunks: chunks.length,
      scanned_characters: chunk.end,
      total_characters: text.length,
    })
  }
  return aggregateDocumentScans(text, scans)
}
