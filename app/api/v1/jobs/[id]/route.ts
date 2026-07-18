import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/api-auth'
import { dynamo,s3,tables } from '@/lib/aws'
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const auth=await authenticateApiKey(request);if(!auth)return NextResponse.json({error:'Invalid API key'},{status:401});if('rateLimited' in auth)return NextResponse.json({error:'Rate limit exceeded'},{status:429});const {id}=await params;const r=await dynamo.send(new GetCommand({TableName:tables.usage,Key:{id:`JOB#${id}`}}));if(!r.Item||r.Item.userId!==auth.userId)return NextResponse.json({error:'Job not found'},{status:404});if(r.Item.status==='complete'&&r.Item.resultKey){const object=await s3.send(new GetObjectCommand({Bucket:process.env.S3_BUCKET_NAME,Key:r.Item.resultKey}));const result=JSON.parse(await object.Body!.transformToString());return NextResponse.json({...r.Item,result})}return NextResponse.json(r.Item)}
