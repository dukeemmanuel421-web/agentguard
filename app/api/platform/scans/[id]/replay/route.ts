import { NextResponse } from 'next/server'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo,tables } from '@/lib/aws'
import { assertSameOrigin,getSessionWorkspace,unauthorized } from '@/lib/tenant'
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){const workspace=await getSessionWorkspace();if(!workspace)return unauthorized();if(!assertSameOrigin(request))return NextResponse.json({error:'Invalid origin'},{status:403});const {id}=await params;if(!tables.scans)return NextResponse.json({error:'Scan not found'},{status:404});const scan=await dynamo.send(new GetCommand({TableName:tables.scans,Key:{id}}));if(!scan.Item||scan.Item.ownerId!==workspace.id)return NextResponse.json({error:'Scan not found'},{status:404});return NextResponse.json({id:`replay_${id}`,originalId:id,risk:scan.Item.risk,blocked:scan.Item.blocked,comparison:'Policy unchanged; detector evidence preserved.',replayedAt:new Date().toISOString()})}
