# AgentGuard

Inbound prompt-injection and context-integrity firewall for AI agents. The Next.js app runs on Vercel; AWS provides DynamoDB, S3, SQS/Lambda, Secrets Manager, and a required private Fargate activation-probe service.

## Deploy

1. Configure AWS credentials locally, then deploy `aws/` with CDK: `cd aws && pnpm install && pnpm deploy -c vercelTeam=TEAM_ID -c vercelProject=PROJECT_ID`.
2. Put the OpenAI key in the generated `OpenAIKey` secret. The probe token is generated and injected into ECS automatically.
3. Copy the stack outputs into Vercel project variables using `.env.example` as the complete list. `AWS_ROLE_ARN` is the stack's Vercel OIDC role, so no long-lived AWS access key is required.
4. Deploy the Next.js project to Vercel. The Fargate probe must be healthy and running for scans to work; scans fail closed when the probe or LLM judge is unavailable.

## Environment variables

See `.env.example`. AWS resource names and URLs come from CDK outputs. `OPENAI_SECRET_ID` and `PROBE_TOKEN_SECRET_ID` are Secrets Manager ARNs, never secret values. `PROBE_SERVICE_URL` is the API Gateway URL backed by VPC Link and the private ALB. `API_RATE_LIMIT_PER_MINUTE` controls per-key DynamoDB conditional rate limits.

## Security architecture

Every scan executes all three detectors concurrently: TypeScript heuristic (35%), OpenAI LLM judge (40%), and private DeBERTa activation probe (25%). Risk `>= 0.62` blocks. API keys are SHA-256 hashed when configured, uploads use five-minute presigned S3 PUTs, SQS has a DLQ, and IAM grants Vercel/Lambda only the resources each needs.

## API

- `POST /api/v1/scan`
- `POST /api/v1/check-action`
- `POST /api/v1/scan-batch`
- `GET /api/v1/jobs/:id`
- `POST /api/v1/uploads`
- `GET /api/v1/examples`

Developer endpoints accept `Authorization: Bearer ag_live_...` when API keys are configured. The console and playground are publicly accessible; production teams should place additional abuse controls in front of public traffic.

## Non-goals

AgentGuard is not output moderation, not a web application firewall, and not a security guarantee. It produces risk-scored findings; organizational policy and human review decide how those findings control production actions.
