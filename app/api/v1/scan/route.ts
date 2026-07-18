import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateApiKey } from '@/lib/api-auth'
import { scanText } from '@/lib/scan'
import { trustLevels } from '@/lib/contracts'
const schema=z.object({text:z.string().min(1).max(50000),source:z.enum(trustLevels).default('UNKNOWN')})
export async function POST(request:Request){
 try { const parsed=schema.safeParse(await request.json()); if(!parsed.success)return NextResponse.json({error:'Invalid request',details:z.treeifyError(parsed.error)},{status:400}); const auth=request.headers.has('authorization')?await authenticateApiKey(request):{userId:'public'}; if(!auth)return NextResponse.json({error:'Invalid API key'},{status:401}); if('rateLimited' in auth)return NextResponse.json({error:'Rate limit exceeded'},{status:429,headers:{'Retry-After':'60'}}); return NextResponse.json(await scanText(parsed.data.text,parsed.data.source,auth.userId))
 } catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Scan failed'},{status:503})}
}
