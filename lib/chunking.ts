import { DOCUMENT_CHUNK_OVERLAP, MAX_SCAN_TEXT_LENGTH } from '@/lib/limits'

export type DocumentChunk = {
  index: number
  start: number
  end: number
  text: string
}

function avoidSplittingSurrogatePair(text: string, offset: number) {
  if (
    offset > 0 &&
    offset < text.length &&
    /[\uD800-\uDBFF]/.test(text[offset - 1]) &&
    /[\uDC00-\uDFFF]/.test(text[offset])
  ) {
    return offset - 1
  }
  return offset
}

export function chunkDocument(
  text: string,
  chunkSize = MAX_SCAN_TEXT_LENGTH,
  overlap = DOCUMENT_CHUNK_OVERLAP,
): DocumentChunk[] {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) throw new Error('Chunk size must be a positive integer.')
  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= chunkSize) {
    throw new Error('Chunk overlap must be a non-negative integer smaller than the chunk size.')
  }
  if (!text.length) return []

  const chunks: DocumentChunk[] = []
  let start = 0
  while (start < text.length) {
    let end = avoidSplittingSurrogatePair(text, Math.min(start + chunkSize, text.length))
    if (end <= start) end = Math.min(start + chunkSize, text.length)
    chunks.push({ index: chunks.length, start, end, text: text.slice(start, end) })
    if (end === text.length) break
    const nextStart = avoidSplittingSurrogatePair(text, end - overlap)
    start = Math.max(start + 1, nextStart)
  }
  return chunks
}
