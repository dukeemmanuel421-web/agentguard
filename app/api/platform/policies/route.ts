import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { defaultPolicy } from '@/lib/policy'
import { can,getWorkspace,listByWorkspace,putWorkspaceItem } from '@/lib/workspace'
const schema=z.object({name:z.string().min(2).max(80),threshold:z.number().min(0).max(1),blockPhrases:z.array(z.string().max(200)).max(50),allowPhrases:z.array(z.string().max(200)).max(50),failClosed:z.boolean()})
export async function POST(req:Request){const session=await auth();if(!session?.user)return NextResponse.json({error:'Unauthorized'},{status:401});const workspace=await getWorkspace(session.user);if(!can(workspace.role,'write'))return NextResponse.json({error:'Insufficient role'},{status:403});const parsed=schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:'Invalid policy'},{status:400});const existing=await listByWorkspace(workspace.id,'policy');const version=Math.max(0,...existing.map(x=>Number(x.version)||0))+1;const policy={...defaultPolicy,...parsed.data,id:`policy_${Date.now()}`,version,status:'active',publishedBy:workspace.userId,createdAt:new Date().toISOString()};await putWorkspaceItem(workspace.id,'policy',policy.id,policy);return NextResponse.json(policy,{status:201})}
