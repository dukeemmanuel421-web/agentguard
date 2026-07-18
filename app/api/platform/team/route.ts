import { NextResponse } from 'next/server'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { can,getWorkspace,putWorkspaceItem } from '@/lib/workspace'
const schema=z.object({email:z.email(),role:z.enum(['admin','developer','viewer'])})
export async function POST(req:Request){const workspace=await getWorkspace();if(!can(workspace.role,'admin'))return NextResponse.json({error:'Admin role required'},{status:403});const parsed=schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:'Invalid invitation'},{status:400});const id=nanoid(24);const invite=await putWorkspaceItem(workspace.id,'invite',id,{...parsed.data,status:'pending',invitedBy:workspace.userId,expiresAt:Math.floor(Date.now()/1000)+604800,createdAt:new Date().toISOString()});return NextResponse.json(invite,{status:201})}
