/** Maximum input accepted by the existing single-text scan endpoint. */
export const MAX_SCAN_TEXT_LENGTH = 50_000

/** Hard limit for synchronous and streaming document scans. */
export const MAX_DOCUMENT_TEXT_LENGTH = 5_000_000

/**
 * Repeated context on either side of a chunk boundary. This keeps detector
 * patterns that straddle a boundary visible to at least one scan.
 */
export const DOCUMENT_CHUNK_OVERLAP = 2_000
