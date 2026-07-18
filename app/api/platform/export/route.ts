import { NextResponse } from 'next/server'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo,tables } from '@/lib/aws'
import { csvCell } from '@/lib/platform-utils'
import { getWorkspace } from '@/lib/workspace'
export async function GET(){const workspace=await getWorkspace();const items=tables.scans?await dynamo.send(new QueryCommand({TableName:tables.scans,IndexName:'byOwner',KeyConditionExpression:'ownerId=:id',ExpressionAttributeValues:{':id':workspace.id},ScanIndexForward:false,Limit:1000})).then(r=>r.Items||[]).catch(()=>[]):[];const rows=['id,created_at,source,risk,verdict,latency_ms',...items.map(x=>[x.id,x.createdAt,x.source,x.risk,x.blocked?'blocked':'allowed',x.latencyMs].map(csvCell).join(','))];return new NextResponse(rows.join('\n'),{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="agentguard-scans.csv"'}})}
