import {describe,expect,it} from 'vitest'
import {assertSafeWebhookUrl} from './webhook-url'

describe('assertSafeWebhookUrl',()=>{
 it.each(['http://example.com/hook','https://127.0.0.1/hook','https://localhost/hook','https://10.0.0.1/hook','https://example.com:8443/hook'])('rejects unsafe destination %s',async url=>{
  await expect(assertSafeWebhookUrl(url)).rejects.toThrow()
 })
})
