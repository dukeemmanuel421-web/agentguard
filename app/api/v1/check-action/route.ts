import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateApiKey } from '@/lib/api-auth'
import { scanText } from '@/lib/scan'
import { resolveTraceId } from '@/lib/trace'

const schema = z.object({
  tool_call: z.record(z.string(), z.unknown()),
  reasoning_trace: z.array(z.string()).max(50).default([]),
  trusted_context: z.array(z.string()).max(50).default([]),
})

const UNSUPPORTED_ACTION_RISK = 0.78

export async function POST(request: Request) {
  try {
    const body = schema.safeParse(await request.json())
    if (!body.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const auth = request.headers.has('authorization') ? await authenticateApiKey(request) : { workspaceId: 'public' }
    if (!auth) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    if ('rateLimited' in auth) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': '60' } })
    }

    const traceId = resolveTraceId(request)
    const text = [
      'PROPOSED TOOL CALL',
      JSON.stringify(body.data.tool_call),
      '',
      'UNTRUSTED REASONING TRACE',
      body.data.reasoning_trace.join('\n'),
      '',
      'TRUSTED SUPPORT',
      body.data.trusted_context.join('\n') || '[none]',
    ].join('\n')

    const scan = await scanText(text, 'TOOL_CALL', auth.workspaceId, traceId)
    const unsupported = body.data.trusted_context.length === 0 && body.data.reasoning_trace.length > 0
    const risk = Math.max(scan.risk, unsupported ? UNSUPPORTED_ACTION_RISK : 0)
    const blocked = scan.blocked || risk >= scan.policy.threshold
    const reason = unsupported
      ? 'Tool call is not supported by trusted context.'
      : blocked
        ? scan.policy.reason
        : 'Tool call follows from trusted context.'

    return NextResponse.json({
      allowed: !blocked,
      risk,
      reason,
      findings: scan.findings,
      policy: scan.policy,
      provenance: scan.provenance,
      degraded: scan.degraded,
      trace_id: traceId,
    }, { headers: { 'x-agentguard-trace-id': traceId } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Action check failed' }, { status: 503 })
  }
}
