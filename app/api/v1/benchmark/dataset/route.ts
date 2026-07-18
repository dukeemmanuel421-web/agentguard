import { NextResponse } from 'next/server'
import dataset from '@/benchmarks/injection-v1.json'

export const dynamic = 'force-static'

export async function GET() {
  return NextResponse.json(dataset, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, immutable',
      'Content-Disposition': 'attachment; filename="agentguard-injection-v1.0.0.json"',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
