import { afterEach, describe, expect, it, vi } from 'vitest'

const {getWorkspaceItem}=vi.hoisted(()=>({getWorkspaceItem:vi.fn()}))
vi.mock('@/lib/workspace',()=>({getWorkspaceItem}))
vi.mock('@/lib/provider-crypto',()=>({decryptProviderKey:vi.fn()}))

describe('provider settings',()=>{
  afterEach(()=>{
    vi.unstubAllEnvs()
    vi.resetModules()
    getWorkspaceItem.mockReset()
  })

  it('supports selecting OpenRouter from the server environment',async()=>{
    vi.stubEnv('PROVIDER_MODE','openrouter')
    getWorkspaceItem.mockResolvedValue(undefined)

    const {getProviderSettings}=await import('./providers')

    await expect(getProviderSettings('public')).resolves.toEqual({mode:'openrouter'})
  })
})
