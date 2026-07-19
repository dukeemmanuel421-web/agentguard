import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { DeleteCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, tables } from '@/lib/aws'
import { hashKey } from '@/lib/api-auth'
import { assertSameOrigin, getSessionWorkspace, unauthorized } from '@/lib/tenant'

const apiKeyStorageHelp = {
  error: 'API key storage is not configured',
  detail:
    'Set DYNAMODB_API_KEYS_TABLE to the ApiKeysTable CDK output and make sure the app has DynamoDB read/write access.',
  missingEnv: 'DYNAMODB_API_KEYS_TABLE',
  setup: [
    'Run `cd aws && pnpm cdk deploy -c vercelTeam=<team> -c vercelProject=<project>` or create an equivalent DynamoDB table.',
    'Copy the ApiKeysTable output into DYNAMODB_API_KEYS_TABLE for your Vercel or local environment.',
    'Set AWS_REGION and, on Vercel, AWS_ROLE_ARN from the VercelRoleArn output so the app can write the table.',
    'Redeploy or restart the app after changing environment variables.',
  ],
}

export async function GET() {
  const workspace = await getSessionWorkspace()
  if (!workspace) return unauthorized()

  if (!tables.apiKeys) return NextResponse.json([])

  const response = await dynamo.send(
    new QueryCommand({
      TableName: tables.apiKeys,
      IndexName: 'byWorkspace',
      KeyConditionExpression: 'workspaceId=:id',
      ExpressionAttributeValues: { ':id': workspace.id },
    }),
  )

  return NextResponse.json(
    (response.Items || []).map(({ keyHash, userId, ...safe }) => ({ ...safe, keyHash })),
  )
}

export async function POST(request: Request) {
  const workspace = await getSessionWorkspace()
  if (!workspace) return unauthorized()
  if (!assertSameOrigin(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  if (!tables.apiKeys) return NextResponse.json(apiKeyStorageHelp, { status: 503 })

  const { name } = await request.json()
  const raw = `ag_live_${randomBytes(24).toString('base64url')}`
  const item = {
    keyHash: hashKey(raw),
    userId: workspace.userId,
    workspaceId: workspace.id,
    createdBy: workspace.userId,
    name: String(name || 'Default key').slice(0, 80),
    prefix: raw.slice(0, 16),
    createdAt: new Date().toISOString(),
  }

  await dynamo.send(
    new PutCommand({
      TableName: tables.apiKeys,
      Item: item,
      ConditionExpression: 'attribute_not_exists(keyHash)',
    }),
  )

  return NextResponse.json({ ...item, keyHash: undefined, key: raw }, { status: 201 })
}

export async function DELETE(request: Request) {
  const workspace = await getSessionWorkspace()
  if (!workspace) return unauthorized()
  if (!assertSameOrigin(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })

  const keyHash = new URL(request.url).searchParams.get('keyHash')
  if (!keyHash) return NextResponse.json({ error: 'Missing keyHash' }, { status: 400 })

  if (tables.apiKeys) {
    await dynamo.send(
      new DeleteCommand({
        TableName: tables.apiKeys,
        Key: { keyHash },
        ConditionExpression: 'workspaceId=:id',
        ExpressionAttributeValues: { ':id': workspace.id },
      }),
    )
  }

  return NextResponse.json({ revoked: true })
}
