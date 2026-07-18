import { NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { z } from 'zod'
import { authenticateApiKey } from '@/lib/api-auth'
import { scanText } from '@/lib/scan'
import { trustLevels } from '@/lib/contracts'
import { resolveTraceId } from '@/lib/trace'
import { emitScanWebhooks } from '@/lib/webhooks'
import { MAX_SCAN_TEXT_LENGTH } from '@/lib/limits'
const schema=z.object({text:z.string().min(1).max(MAX_SCAN_TEXT_LENGTH),source:z.enum(trustLevels).default('UNKNOWN')})
export async function POST(request:Request){
 try { const parsed=schema.safeParse(await request.json()); if(!parsed.success)return NextResponse.json({error:'Invalid request',details:z.treeifyError(parsed.error)},{status:400}); const auth=request.headers.has('authorization')?await authenticateApiKey(request):{workspaceId:'public'}; if(!auth)return NextResponse.json({error:'Invalid API key'},{status:401}); if('rateLimited' in auth)return NextResponse.json({error:'Rate limit exceeded'},{status:429,headers:{'Retry-After':'60'}});const traceId=resolveTraceId(request);const result=await scanText(parsed.data.text,parsed.data.source,auth.workspaceId,traceId);waitUntil(emitScanWebhooks({workspaceId:auth.workspaceId,traceId,source:parsed.data.source,result}));return NextResponse.json({...result,trace_id:traceId},{headers:{'x-agentguard-trace-id':traceId}})
 } catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Scan failed'},{status:503})}
}
