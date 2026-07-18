import { NextResponse } from 'next/server'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo,tables } from '@/lib/aws'
import { defaultPolicy } from '@/lib/policy'
import { getWorkspace,listByWorkspace } from '@/lib/workspace'
import { getProviderStatus } from '@/lib/providers'
export async function GET(){const workspace=await getWorkspace();const scans=tables.scans?await dynamo.send(new QueryCommand({TableName:tables.scans,IndexName:'byOwner',KeyConditionExpression:'ownerId=:id',ExpressionAttributeValues:{':id':workspace.id},ScanIndexForward:false,Limit:100})).then(r=>r.Items||[]).catch(()=>[]):[];const [policies,webhooks,members,providers]=await Promise.all([listByWorkspace(workspace.id,'policy'),listByWorkspace(workspace.id,'webhook'),listByWorkspace(workspace.id,'membership'),getProviderStatus(workspace.id)]);return NextResponse.json({workspace,scans,policy:policies.find(x=>x.status==='active')||defaultPolicy,webhooks,members:members.map(x=>({id:x.userId,email:x.email,role:x.role})),providers})}
