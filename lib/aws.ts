import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocument,DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { S3Client } from '@aws-sdk/client-s3'
import { SQSClient } from '@aws-sdk/client-sqs'
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import { LambdaClient } from '@aws-sdk/client-lambda'
import { awsCredentialsProvider } from '@vercel/functions/oidc'

const region=process.env.AWS_REGION || 'us-east-1'
const credentials=process.env.AWS_ROLE_ARN ? awsCredentialsProvider({roleArn:process.env.AWS_ROLE_ARN,clientConfig:{region}}) : undefined
const dynamoClient=new DynamoDBClient({region,credentials})
export const dynamo=DynamoDBDocumentClient.from(dynamoClient,{marshallOptions:{removeUndefinedValues:true}})
export const authDynamo=DynamoDBDocument.from(dynamoClient,{marshallOptions:{removeUndefinedValues:true}})
export const s3=new S3Client({region,credentials})
export const sqs=new SQSClient({region,credentials})
export const secrets=new SecretsManagerClient({region,credentials})
export const lambda=new LambdaClient({region,credentials})
export const tables={users:process.env.DYNAMODB_USERS_TABLE!,apiKeys:process.env.DYNAMODB_API_KEYS_TABLE!,scans:process.env.DYNAMODB_SCANS_TABLE!,usage:process.env.DYNAMODB_USAGE_TABLE!,auth:process.env.DYNAMODB_AUTH_TABLE!,platform:process.env.DYNAMODB_PLATFORM_TABLE!}
