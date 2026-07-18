import { NextResponse } from 'next/server'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo,tables } from '@/lib/aws'
import { defaultPolicy } from '@/lib/policy'
import { listByWorkspace } from '@/lib/workspace'
import { getSessionWorkspace,unauthorized } from '@/lib/tenant'
import { getProviderStatus } from '@/lib/providers'
export async function GET(){const workspace=await getSessionWorkspace();if(!workspace)return unauthorized();const scans=tables.scans?await dynamo.send(new QueryCommand({TableName:tables.scans,IndexName:'byOwner',KeyConditionExpression:'ownerId=:id',ExpressionAttributeValues:{':id':workspace.id},ScanIndexForward:false,Limit:100})).then(r=>r.Items||[]).catch(()=>[]):[];const [policies,webhooks,members,providers]=await Promise.all([listByWorkspace(workspace.id,'policy'),listByWorkspace(workspace.id,'webhook'),listByWorkspace(workspace.id,'membership'),getProviderStatus(workspace.id)]);const activePolicy=policies.filter(x=>x.status==='active').sort((a,b)=>(Number(b.version)||0)-(Number(a.version)||0))[0]||defaultPolicy;return NextResponse.json({workspace,scans,policy:activePolicy,webhooks,members:members.map(x=>({id:x.userId,email:x.email,role:x.role})),providers})}
