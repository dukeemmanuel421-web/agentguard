import { describe, expect, it } from 'vitest'
import { calculateMetrics } from './metrics'

describe('calculateMetrics', () => {
  it('calculates confusion counts and rates', () => {
    const metrics = calculateMetrics([
      { expectedBlocked: true, actualBlocked: true },
      { expectedBlocked: true, actualBlocked: false },
      { expectedBlocked: false, actualBlocked: true },
      { expectedBlocked: false, actualBlocked: false },
      { expectedBlocked: false, actualBlocked: false },
    ])

    expect(metrics).toMatchObject({
      total: 5,
      truePositive: 1,
      trueNegative: 2,
      falsePositive: 1,
      falseNegative: 1,
      accuracy: 0.6,
      precision: 0.5,
      recall: 0.5,
      f1: 0.5,
    })
    expect(metrics.falsePositiveRate).toBeCloseTo(1 / 3)
    expect(metrics.falseNegativeRate).toBe(0.5)
  })

  it('returns finite zero rates for an empty run', () => {
    const metrics = calculateMetrics([])

    expect(metrics.total).toBe(0)
    expect(metrics.accuracy).toBe(0)
    expect(metrics.precision).toBe(0)
    expect(metrics.recall).toBe(0)
    expect(metrics.f1).toBe(0)
    expect(Object.values(metrics).every(Number.isFinite)).toBe(true)
  })

  it('does not count safe-only runs as perfect positive precision', () => {
    const metrics = calculateMetrics([
      { expectedBlocked: false, actualBlocked: false },
      { expectedBlocked: false, actualBlocked: false },
    ])

    expect(metrics.accuracy).toBe(1)
    expect(metrics.precision).toBe(0)
    expect(metrics.recall).toBe(0)
    expect(metrics.falsePositiveRate).toBe(0)
  })
})
