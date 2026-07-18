import {afterEach,describe,expect,it,vi} from 'vitest'

const {getSession,getWorkspace}=vi.hoisted(()=>({getSession:vi.fn(),getWorkspace:vi.fn()}))
vi.mock('@/lib/auth',()=>({getSession}))
vi.mock('@/lib/workspace',()=>({
 publicWorkspace:{id:'public',name:'Public workspace',role:'owner',userId:'public'},
 getWorkspace,
}))

describe('optional platform authentication',()=>{
 afterEach(()=>{vi.unstubAllEnvs();vi.resetAllMocks()})
 it('uses the public demo workspace when auth is disabled',async()=>{
  vi.stubEnv('PLATFORM_AUTH_REQUIRED','false')
  const {getSessionWorkspace}=await import('./tenant')
  await expect(getSessionWorkspace()).resolves.toMatchObject({id:'public'})
  expect(getSession).not.toHaveBeenCalled()
 })
 it('requires a session when auth is enabled',async()=>{
  vi.stubEnv('PLATFORM_AUTH_REQUIRED','true');getSession.mockResolvedValue(null)
  const {getSessionWorkspace}=await import('./tenant')
  await expect(getSessionWorkspace()).resolves.toBeNull()
 })
})
