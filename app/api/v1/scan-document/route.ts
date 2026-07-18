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

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: z.treeifyError(parsed.error) }, { status: 400 })
    const auth = request.headers.has('authorization') ? await authenticateApiKey(request) : { workspaceId: 'public' }
    if (!auth) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    if ('rateLimited' in auth) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': '60' } })
    return NextResponse.json(await scanDocument(parsed.data.text, parsed.data.source, auth.workspaceId))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Document scan failed' }, { status: 503 })
  }
}
