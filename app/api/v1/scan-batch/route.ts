import { SendMessageCommand } from '@aws-sdk/client-sqs'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { authenticateApiKey } from '@/lib/api-auth'
import { dynamo,sqs,tables } from '@/lib/aws'
const schema=z.union([z.object({s3Key:z.string().min(1).max(1024)}),z.object({items:z.array(z.object({text:z.string().min(1).max(50000),source:z.string().min(1).max(50)})).min(1).max(100)})])
export async function POST(request:Request){const auth=await authenticateApiKey(request);if(!auth)return NextResponse.json({error:'Invalid API key'},{status:401});if('rateLimited' in auth)return NextResponse.json({error:'Rate limit exceeded'},{status:429});const body=schema.safeParse(await request.json());if(!body.success)return NextResponse.json({error:'Invalid batch'},{status:400});if('s3Key' in body.data&&!body.data.s3Key.startsWith(`uploads/${auth.userId}/`))return NextResponse.json({error:'Upload does not belong to this API key'},{status:403});const jobId=nanoid();await dynamo.send(new PutCommand({TableName:tables.usage,Item:{id:`JOB#${jobId}`,userId:auth.userId,status:'queued',createdAt:new Date().toISOString()}}));await sqs.send(new SendMessageCommand({QueueUrl:process.env.SQS_QUEUE_URL,MessageBody:JSON.stringify({jobId,userId:auth.userId,...body.data})}));return NextResponse.json({jobId},{status:202})}
