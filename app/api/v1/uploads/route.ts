import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { authenticateApiKey } from '@/lib/api-auth'
import { s3 } from '@/lib/aws'
const schema=z.object({filename:z.string().min(1).max(180),contentType:z.string().max(100)})
export async function POST(request:Request){const auth=await authenticateApiKey(request);if(!auth)return NextResponse.json({error:'Invalid API key'},{status:401});if('rateLimited' in auth)return NextResponse.json({error:'Rate limit exceeded'},{status:429});const body=schema.safeParse(await request.json());if(!body.success)return NextResponse.json({error:'Invalid upload request'},{status:400});const key=`uploads/${auth.workspaceId}/${nanoid()}-${body.data.filename.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const url=await getSignedUrl(s3,new PutObjectCommand({Bucket:process.env.S3_BUCKET_NAME,Key:key,ContentType:body.data.contentType,ServerSideEncryption:'AES256'}),{expiresIn:300});return NextResponse.json({url,key,expiresIn:300})}
