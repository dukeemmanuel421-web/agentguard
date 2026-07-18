import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { DeleteCommand,PutCommand,QueryCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo,tables } from '@/lib/aws'
import { hashKey } from '@/lib/api-auth'
import { getWorkspace } from '@/lib/workspace'
export async function GET(){const workspace=await getWorkspace();if(!tables.apiKeys)return NextResponse.json([]);const r=await dynamo.send(new QueryCommand({TableName:tables.apiKeys,IndexName:'byUser',KeyConditionExpression:'userId=:id',ExpressionAttributeValues:{':id':workspace.id}}));return NextResponse.json((r.Items||[]).map(({keyHash,userId,...safe})=>({...safe,keyHash})))}
export async function POST(request:Request){const workspace=await getWorkspace();const {name}=await request.json();const raw=`ag_live_${randomBytes(24).toString('base64url')}`;const item={keyHash:hashKey(raw),userId:workspace.id,workspaceId:workspace.id,createdBy:workspace.userId,name:String(name||'Default key').slice(0,80),prefix:raw.slice(0,16),createdAt:new Date().toISOString(),ephemeral:!tables.apiKeys};if(tables.apiKeys)await dynamo.send(new PutCommand({TableName:tables.apiKeys,Item:item,ConditionExpression:'attribute_not_exists(keyHash)'}));return NextResponse.json({...item,keyHash:undefined,key:raw},{status:201})}
export async function DELETE(request:Request){const workspace=await getWorkspace();const keyHash=new URL(request.url).searchParams.get('keyHash');if(!keyHash)return NextResponse.json({error:'Missing keyHash'},{status:400});if(tables.apiKeys)await dynamo.send(new DeleteCommand({TableName:tables.apiKeys,Key:{keyHash},ConditionExpression:'userId=:id',ExpressionAttributeValues:{':id':workspace.id}}));return NextResponse.json({revoked:true})}
