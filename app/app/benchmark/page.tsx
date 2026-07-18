import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Download, ShieldCheck } from 'lucide-react'
import baselineJson from '@/benchmarks/baseline-v1.json'
import datasetJson from '@/benchmarks/injection-v1.json'
import { AgentGuardLogo } from '@/components/agentguard-logo'
import { Button } from '@/components/ui/button'
import { calculateMetrics } from '@/lib/benchmark/metrics'
import type { BenchmarkCategory, BenchmarkDataset, BenchmarkRun } from '@/lib/benchmark/types'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Injection benchmark',
  description: 'Read-only results for the versioned AgentGuard prompt-injection benchmark.',
}

const dataset = datasetJson as BenchmarkDataset
const baseline = baselineJson as BenchmarkRun
const metrics = calculateMetrics(baseline.predictions)
const categories: BenchmarkCategory[] = ['attack', 'benign', 'borderline']
const predictions = new Map(baseline.predictions.map(prediction => [prediction.caseId, prediction]))

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function categoryMetrics(category: BenchmarkCategory) {
  const ids = new Set(dataset.cases.filter(item => item.category === category).map(item => item.id))
  return calculateMetrics(baseline.predictions.filter(prediction => ids.has(prediction.caseId)))
}

export default function BenchmarkPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <AgentGuardLogo />
          <Button render={<Link href="/app" />} nativeButton={false} variant="ghost" size="sm">
            <ArrowLeft /> Console
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        <section className="grid gap-8 border-b pb-12 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.2em] text-muted-foreground">
              Public evaluation · dataset v{dataset.datasetVersion}
            </p>
            <h1 className="mt-5 max-w-4xl text-balance text-5xl font-medium tracking-[-.05em] md:text-7xl">
              Injection benchmark
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              A reproducible set of attack, benign, and borderline cases. Results below are from the committed
              reference run, not a live production claim.
            </p>
          </div>
          <Button
            render={<a href="/api/v1/benchmark/dataset" />}
            nativeButton={false}
            variant="outline"
            className="rounded-full"
          >
            <Download /> Dataset JSON
          </Button>
        </section>

        <section aria-labelledby="summary-heading" className="py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Reference run</p>
              <h2 id="summary-heading" className="mt-2 text-3xl font-medium tracking-tight">
                Evaluation summary
              </h2>
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              {baseline.runId} · {dataset.cases.length} cases
            </p>
          </div>

          <div className="mt-8 grid border sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Accuracy" value={percent(metrics.accuracy)} />
            <Metric label="Precision" value={percent(metrics.precision)} />
            <Metric label="Recall" value={percent(metrics.recall)} />
            <Metric label="F1 score" value={percent(metrics.f1)} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="border bg-card p-6">
              <h3 className="font-medium">Error profile</h3>
              <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden border bg-border">
                <Count label="True positive" value={metrics.truePositive} tone="safe" />
                <Count label="True negative" value={metrics.trueNegative} tone="safe" />
                <Count label="False positive" value={metrics.falsePositive} tone="error" />
                <Count label="False negative" value={metrics.falseNegative} tone="error" />
              </div>
              <div className="mt-5 flex justify-between gap-4 text-sm text-muted-foreground">
                <span>False-positive rate {percent(metrics.falsePositiveRate)}</span>
                <span>False-negative rate {percent(metrics.falseNegativeRate)}</span>
              </div>
            </div>

            <div className="border bg-card p-6">
              <h3 className="font-medium">Performance by case class</h3>
              <div className="mt-5 divide-y border-y">
                {categories.map(category => {
                  const result = categoryMetrics(category)
                  return (
                    <div key={category} className="grid grid-cols-[1fr_auto_auto] items-center gap-6 py-4">
                      <span className="capitalize">{category}</span>
                      <span className="font-mono text-xs text-muted-foreground">{result.total} cases</span>
                      <span className="font-mono text-sm">{percent(result.accuracy)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="cases-heading" className="border-t py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Case index</p>
              <h2 id="cases-heading" className="mt-2 text-3xl font-medium tracking-tight">
                Curated coverage
              </h2>
            </div>
            <p className="max-w-lg text-sm text-muted-foreground">
              Payload text is intentionally omitted from this page. Download the versioned JSON for controlled
              evaluation.
            </p>
          </div>

          <div className="mt-8 overflow-x-auto border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-muted/50 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-normal">Case</th>
                  <th className="px-4 py-3 font-normal">Class</th>
                  <th className="px-4 py-3 font-normal">Coverage</th>
                  <th className="px-4 py-3 text-right font-normal">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dataset.cases.map(item => {
                  const prediction = predictions.get(item.id)
                  const passed = prediction?.actualBlocked === item.expectedBlocked
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-4">
                        <span className="font-medium">{item.title}</span>
                        <span className="ml-3 font-mono text-xs text-muted-foreground">{item.id}</span>
                      </td>
                      <td className="px-4 py-4 capitalize">{item.category}</td>
                      <td className="px-4 py-4 text-muted-foreground">{item.tags.join(' · ')}</td>
                      <td className="px-4 py-4 text-right">
                        <span className={passed ? 'text-foreground' : 'text-destructive'}>
                          {passed ? 'Pass' : 'Miss'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="flex items-center gap-3 border-t py-8 text-sm text-muted-foreground">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Dataset and reference output contain no credentials or live collection endpoints.
        </footer>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b p-6 last:border-b-0 sm:border-r sm:[&:nth-child(2)]:border-r-0 lg:border-b-0 lg:[&:nth-child(2)]:border-r">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-8 font-mono text-4xl">{value}</p>
    </div>
  )
}

function Count({ label, value, tone }: { label: string; value: number; tone: 'safe' | 'error' }) {
  return (
    <div className="bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={tone === 'error' ? 'mt-2 font-mono text-2xl text-destructive' : 'mt-2 font-mono text-2xl'}>
        {value}
      </p>
    </div>
  )
}
