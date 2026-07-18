import {describe,expect,it} from 'vitest'
import {resolveTraceId} from './trace'

describe('resolveTraceId',()=>{
 it('preserves a valid caller trace id',()=>{
  expect(resolveTraceId(new Request('https://agentguard.test',{headers:{'x-agentguard-trace-id':'tr_abcdefghijklmnop'}}))).toBe('tr_abcdefghijklmnop')
 })
 it('replaces invalid trace ids',()=>{
  expect(resolveTraceId(new Request('https://agentguard.test',{headers:{'x-agentguard-trace-id':'bad'}}))).toMatch(/^tr_[A-Za-z0-9_-]{16}$/)
 })
})
