import { describe, expect, it } from 'vitest'
import baseline from '@/benchmarks/baseline-v1.json'
import dataset from '@/benchmarks/injection-v1.json'
import { calculateMetrics } from './metrics'

describe('injection benchmark dataset', () => {
  it('is versioned, curated, and has unique stable case IDs', () => {
    expect(dataset.schemaVersion).toBe('1')
    expect(dataset.datasetVersion).toMatch(/^\d+\.\d+\.\d+$/)
    expect(dataset.cases.length).toBeGreaterThanOrEqual(20)
    expect(new Set(dataset.cases.map(item => item.id)).size).toBe(dataset.cases.length)
    expect(new Set(dataset.cases.map(item => item.category))).toEqual(
      new Set(['attack', 'benign', 'borderline']),
    )
    expect(dataset.cases.every(item => item.text.length > 0 && item.rationale.length > 0)).toBe(true)
  })

  it('keeps the committed baseline aligned with dataset expectations', () => {
    const expected = new Map(dataset.cases.map(item => [item.id, item.expectedBlocked]))

    expect(baseline.datasetVersion).toBe(dataset.datasetVersion)
    expect(baseline.predictions).toHaveLength(dataset.cases.length)
    expect(new Set(baseline.predictions.map(item => item.caseId)).size).toBe(dataset.cases.length)
    for (const prediction of baseline.predictions) {
      expect(expected.get(prediction.caseId)).toBe(prediction.expectedBlocked)
    }

    const metrics = calculateMetrics(baseline.predictions)
    expect(metrics).toMatchObject({
      total: 24,
      truePositive: 11,
      trueNegative: 9,
      falsePositive: 2,
      falseNegative: 2,
    })
  })

  it('uses inert destinations and placeholder credential patterns', () => {
    const combined = dataset.cases.map(item => item.text).join('\n')

    expect(combined).not.toMatch(/https?:\/\/(?![^/\s]+\.example\.invalid)/)
    expect(combined).not.toMatch(/\b(?:sk|ghp)_[A-Za-z0-9]{20,}\b/)
  })
})
