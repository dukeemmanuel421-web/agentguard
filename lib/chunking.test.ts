import { describe, expect, it } from 'vitest'
import { chunkDocument } from './chunking'

describe('chunkDocument', () => {
  it('returns short documents unchanged', () => {
    expect(chunkDocument('hello', 10, 2)).toEqual([
      { index: 0, start: 0, end: 5, text: 'hello' },
    ])
  })

  it('creates bounded chunks with the requested overlap', () => {
    const chunks = chunkDocument('abcdefghijklmnop', 8, 3)

    expect(chunks.map(chunk => chunk.text)).toEqual(['abcdefgh', 'fghijklm', 'klmnop'])
    expect(chunks.every(chunk => chunk.text.length <= 8)).toBe(true)
    expect(chunks[0].text.slice(-3)).toBe(chunks[1].text.slice(0, 3))
    expect(chunks[1].text.slice(-3)).toBe(chunks[2].text.slice(0, 3))
  })

  it('does not split UTF-16 surrogate pairs', () => {
    const chunks = chunkDocument('abc😀def', 4, 1)

    expect(chunks.map(chunk => chunk.text)).toEqual(['abc', 'c😀d', 'def'])
    expect(chunks.every(chunk => !/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/.test(chunk.text))).toBe(true)
  })

  it('rejects overlap that cannot make forward progress', () => {
    expect(() => chunkDocument('hello', 5, 5)).toThrow(/overlap/)
  })
})
