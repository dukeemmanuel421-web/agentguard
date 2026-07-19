import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/aws', () => ({
  dynamo: { send: vi.fn() },
  tables: { apiKeys: '' },
}))
vi.mock('@/lib/tenant', () => ({
  assertSameOrigin: vi.fn(() => true),
  getSessionWorkspace: vi.fn(async () => ({ id: 'workspace-demo', userId: 'user-demo' })),
  unauthorized: vi.fn(() => new Response('Unauthorized', { status: 401 })),
}))
vi.mock('@/lib/api-auth', () => ({ hashKey: vi.fn(() => 'hashed-key') }))

describe('api key route', () => {
  it('returns actionable setup guidance when API key storage is missing', async () => {
    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost/api/keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://localhost' },
        body: JSON.stringify({ name: 'Production' }),
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toMatchObject({
      error: 'API key storage is not configured',
      missingEnv: 'DYNAMODB_API_KEYS_TABLE',
    })
    expect(payload.detail).toContain('ApiKeysTable CDK output')
    expect(payload.setup).toContain('Redeploy or restart the app after changing environment variables.')
  })
})
