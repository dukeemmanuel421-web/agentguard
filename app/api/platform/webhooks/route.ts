import { randomBytes,createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { can,getWorkspace,putWorkspaceItem } from '@/lib/workspace'
const schema=z.object({url:z.url().refine(v=>v.startsWith('https://'),'HTTPS required'),events:z.array(z.enum(['scan.blocked','risk.elevated','detector.degraded','batch.completed'])).min(1)})
export async function POST(req:Request){const workspace=await getWorkspace();if(!can(workspace.role,'admin'))return NextResponse.json({error:'Admin role required'},{status:403});const parsed=schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:'Invalid HTTPS webhook'},{status:400});const id=nanoid(12),secret=`whsec_${randomBytes(24).toString('base64url')}`;const hook=await putWorkspaceItem(workspace.id,'webhook',id,{...parsed.data,secretHash:createHash('sha256').update(secret).digest('hex'),active:true,createdAt:new Date().toISOString()});return NextResponse.json({...hook,secretHash:undefined,secret},{status:201})}
