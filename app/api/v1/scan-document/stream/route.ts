import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateApiKey } from '@/lib/api-auth'
import { trustLevels } from '@/lib/contracts'
import { MAX_DOCUMENT_TEXT_LENGTH } from '@/lib/limits'
import { scanDocument } from '@/lib/scan-document'

const schema = z.object({
  text: z.string().min(1).max(MAX_DOCUMENT_TEXT_LENGTH),
  source: z.enum(trustLevels).default('DOCUMENT'),
})
const encoder = new TextEncoder()

export async function POST(request: Request) {
  let body: z.infer<typeof schema>
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: z.treeifyError(parsed.error) }, { status: 400 })
    body = parsed.data
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

    const auth = request.headers.has('authorization') ? await authenticateApiKey(request) : { workspaceId: 'public' }
  if (!auth) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  if ('rateLimited' in auth) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': '60' } })

  const stream = new ReadableStream({
    async start(controller) {
      const write = (value: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`))
      try {
        const result = await scanDocument(body.text, body.source, auth.workspaceId, write)
        // Progress events deliberately contain no partial risk or block decision.
        write({ type: 'result', result })
      } catch (error) {
        write({ type: 'error', error: error instanceof Error ? error.message : 'Document scan failed' })
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
