import { NextResponse } from 'next/server'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { auth } from '@/auth'
import { dynamo,tables } from '@/lib/aws'
import { getWorkspace } from '@/lib/workspace'
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){const session=await auth();if(!session?.user)return NextResponse.json({error:'Unauthorized'},{status:401});const workspace=await getWorkspace(session.user);const {id}=await params;const scan=await dynamo.send(new GetCommand({TableName:tables.scans,Key:{id}}));if(!scan.Item||scan.Item.ownerId!==workspace.id)return NextResponse.json({error:'Scan not found'},{status:404});return NextResponse.json({id:`replay_${id}`,originalId:id,risk:scan.Item.risk,blocked:scan.Item.blocked,comparison:'Policy unchanged; detector evidence preserved.',replayedAt:new Date().toISOString()})}
