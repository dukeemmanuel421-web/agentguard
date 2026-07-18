import { randomBytes,createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { encryptProviderKey } from '@/lib/provider-crypto'
import { can,listByWorkspace,putWorkspaceItem } from '@/lib/workspace'
import { assertSameOrigin,getSessionWorkspace,unauthorized } from '@/lib/tenant'
import { assertSafeWebhookUrl } from '@/lib/webhook-url'
const schema=z.object({url:z.url().refine(v=>v.startsWith('https://'),'HTTPS required'),events:z.array(z.enum(['scan.blocked','risk.elevated','detector.degraded'])).min(1)})
export async function GET(){const workspace=await getSessionWorkspace();if(!workspace)return unauthorized();const hooks=await listByWorkspace(workspace.id,'webhook');return NextResponse.json(hooks.map(({secretEnc,secretHash,...hook})=>hook))}
export async function POST(req:Request){const workspace=await getSessionWorkspace();if(!workspace)return unauthorized();if(!assertSameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});if(!can(workspace.role,'admin'))return NextResponse.json({error:'Admin role required'},{status:403});const parsed=schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:'Invalid HTTPS webhook'},{status:400});try{await assertSafeWebhookUrl(parsed.data.url)}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unsafe webhook URL'},{status:400})}const id=nanoid(12),secret=`whsec_${randomBytes(24).toString('base64url')}`;const hook=await putWorkspaceItem(workspace.id,'webhook',id,{...parsed.data,secretHash:createHash('sha256').update(secret).digest('hex'),secretEnc:encryptProviderKey(secret),active:true,createdAt:new Date().toISOString()});return NextResponse.json({...hook,secretHash:undefined,secretEnc:undefined,secret},{status:201})}
