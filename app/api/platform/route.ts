import { NextResponse } from 'next/server'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { auth } from '@/auth'
import { dynamo,tables } from '@/lib/aws'
import { defaultPolicy } from '@/lib/policy'
import { getWorkspace,listByWorkspace } from '@/lib/workspace'
export async function GET(){const session=await auth();if(!session?.user)return NextResponse.json({error:'Unauthorized'},{status:401});const workspace=await getWorkspace(session.user);const scans=await dynamo.send(new QueryCommand({TableName:tables.scans,IndexName:'byOwner',KeyConditionExpression:'ownerId=:id',ExpressionAttributeValues:{':id':workspace.id},ScanIndexForward:false,Limit:100}));const [policies,webhooks,members]=await Promise.all([listByWorkspace(workspace.id,'policy'),listByWorkspace(workspace.id,'webhook'),listByWorkspace(workspace.id,'membership')]);return NextResponse.json({workspace,scans:scans.Items||[],policy:policies.find(x=>x.status==='active')||defaultPolicy,webhooks,members:members.map(x=>({id:x.userId,email:x.email,role:x.role}))})}
