import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/api-auth'
import { dynamo,tables } from '@/lib/aws'
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const auth=await authenticateApiKey(request);if(!auth)return NextResponse.json({error:'Invalid API key'},{status:401});if('rateLimited' in auth)return NextResponse.json({error:'Rate limit exceeded'},{status:429});const {id}=await params;const r=await dynamo.send(new GetCommand({TableName:tables.usage,Key:{id:`JOB#${id}`}}));if(!r.Item||r.Item.userId!==auth.userId)return NextResponse.json({error:'Job not found'},{status:404});return NextResponse.json(r.Item)}
