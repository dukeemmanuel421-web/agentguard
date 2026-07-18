import { randomBytes,createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { auth } from '@/auth'
import { can,getWorkspace,putWorkspaceItem } from '@/lib/workspace'
const schema=z.object({url:z.url().refine(v=>v.startsWith('https://'),'HTTPS required'),events:z.array(z.enum(['scan.blocked','risk.elevated','detector.degraded','batch.completed'])).min(1)})
export async function POST(req:Request){const session=await auth();if(!session?.user)return NextResponse.json({error:'Unauthorized'},{status:401});const workspace=await getWorkspace(session.user);if(!can(workspace.role,'admin'))return NextResponse.json({error:'Admin role required'},{status:403});const parsed=schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:'Invalid HTTPS webhook'},{status:400});const id=nanoid(12),secret=`whsec_${randomBytes(24).toString('base64url')}`;const hook=await putWorkspaceItem(workspace.id,'webhook',id,{...parsed.data,secretHash:createHash('sha256').update(secret).digest('hex'),active:true,createdAt:new Date().toISOString()});return NextResponse.json({...hook,secretHash:undefined,secret},{status:201})}
