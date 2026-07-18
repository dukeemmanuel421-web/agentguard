import type { TrustLevel } from '@/lib/contracts'

export const benchmarkCategories = ['attack', 'benign', 'borderline'] as const
export type BenchmarkCategory = (typeof benchmarkCategories)[number]

export type BenchmarkCase = {
  id: string
  category: BenchmarkCategory
  title: string
  text: string
  source: TrustLevel
  expectedBlocked: boolean
  tags: string[]
  rationale: string
}

export type BenchmarkDataset = {
  schemaVersion: '1'
  datasetVersion: string
  name: string
  description: string
  cases: BenchmarkCase[]
}

export type BenchmarkPrediction = {
  caseId: string
  expectedBlocked: boolean
  actualBlocked: boolean
  risk: number
  latencyMs: number
  error?: string
}

export type BenchmarkRun = {
  schemaVersion: '1'
  datasetVersion: string
  runId: string
  createdAt: string
  target: string
  predictions: BenchmarkPrediction[]
}
