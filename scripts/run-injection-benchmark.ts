#!/usr/bin/env node
import { writeFile } from 'node:fs/promises'
import { calculateMetrics } from '../lib/benchmark/metrics'
import type { BenchmarkDataset, BenchmarkPrediction, BenchmarkRun } from '../lib/benchmark/types'

type Options = {
  baseUrl: string
  datasetUrl: string
  output: string
}

function parseOptions(args: string[]): Options {
  const read = (name: string, fallback: string) => {
    const index = args.indexOf(name)
    if (index === -1) return fallback
    const value = args[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}`)
    return value
  }

  if (args.includes('--help')) {
    console.log('Usage: tsx scripts/run-injection-benchmark.ts [--base-url URL] [--dataset-url URL] [--output FILE]')
    process.exit(0)
  }

  const baseUrl = read('--base-url', process.env.AGENTGUARD_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
  return {
    baseUrl,
    datasetUrl: read('--dataset-url', `${baseUrl}/api/v1/benchmark/dataset`),
    output: read('--output', 'benchmark-run.json'),
  }
}

function isDataset(value: unknown): value is BenchmarkDataset {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<BenchmarkDataset>
  return candidate.schemaVersion === '1'
    && typeof candidate.datasetVersion === 'string'
    && Array.isArray(candidate.cases)
    && candidate.cases.length >= 20
    && candidate.cases.every(item =>
      typeof item?.id === 'string'
      && typeof item?.text === 'string'
      && typeof item?.expectedBlocked === 'boolean'
      && typeof item?.source === 'string')
}

async function fetchDataset(url: string): Promise<BenchmarkDataset> {
  const response = await fetch(url, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(`Dataset request failed with HTTP ${response.status}`)
  const value: unknown = await response.json()
  if (!isDataset(value)) throw new Error('Dataset response does not match benchmark schema v1')
  return value
}

async function evaluateCase(
  baseUrl: string,
  item: BenchmarkDataset['cases'][number],
): Promise<BenchmarkPrediction> {
  const started = performance.now()
  try {
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (process.env.AGENTGUARD_API_KEY) headers.authorization = `Bearer ${process.env.AGENTGUARD_API_KEY}`
    const response = await fetch(`${baseUrl}/api/v1/scan`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text: item.text, source: item.source }),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = await response.json() as { blocked?: unknown; risk?: unknown }
    if (typeof result.blocked !== 'boolean' || typeof result.risk !== 'number') {
      throw new Error('Invalid scan response')
    }
    return {
      caseId: item.id,
      expectedBlocked: item.expectedBlocked,
      actualBlocked: result.blocked,
      risk: result.risk,
      latencyMs: Math.round(performance.now() - started),
    }
  } catch (error) {
    return {
      caseId: item.id,
      expectedBlocked: item.expectedBlocked,
      actualBlocked: false,
      risk: 0,
      latencyMs: Math.round(performance.now() - started),
      error: error instanceof Error ? error.message : 'Unknown request failure',
    }
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2))
  const dataset = await fetchDataset(options.datasetUrl)
  const predictions: BenchmarkPrediction[] = []

  for (const [index, item] of dataset.cases.entries()) {
    const prediction = await evaluateCase(options.baseUrl, item)
    predictions.push(prediction)
    const status = prediction.error ? 'ERROR' : prediction.actualBlocked === prediction.expectedBlocked ? 'PASS' : 'MISS'
    console.log(`[${index + 1}/${dataset.cases.length}] ${item.id} ${status}`)
  }

  const run: BenchmarkRun = {
    schemaVersion: '1',
    datasetVersion: dataset.datasetVersion,
    runId: `run-${new Date().toISOString().replaceAll(/[:.]/g, '-')}`,
    createdAt: new Date().toISOString(),
    target: options.baseUrl,
    predictions,
  }
  await writeFile(options.output, `${JSON.stringify(run, null, 2)}\n`, { mode: 0o600 })

  const metrics = calculateMetrics(predictions)
  console.log(`Accuracy ${(metrics.accuracy * 100).toFixed(1)}% · F1 ${(metrics.f1 * 100).toFixed(1)}% · FP ${metrics.falsePositive} · FN ${metrics.falseNegative}`)
  console.log(`Wrote ${options.output}`)

  if (predictions.some(prediction => prediction.error)) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Benchmark failed')
  process.exitCode = 1
})
