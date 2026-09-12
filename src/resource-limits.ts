import { Buffer } from 'node:buffer';

export const RESOURCE_LIMITS = {
  maxQueryLength: 200,
  maxTermCount: 16,
  maxResultCount: 10,
  maxSnippetLength: 1200,
  maxCorpusEntryBytes: 8192,
  maxResponseBytes: 32768,
  maxStdioFrameBytes: 65536,
  shutdownTimeoutMs: 1000,
} as const;

export type ResourceErrorCode =
  | 'INVALID_QUERY'
  | 'INVALID_LIMIT'
  | 'RESPONSE_TOO_LARGE'
  | 'CORPUS_ENTRY_TOO_LARGE';

export type ResourceError = { code: ResourceErrorCode; message: string };
export type ResourceValidation =
  { ok: true } | { ok: false; error: ResourceError };

export const TOOL_RESOURCE_CONTRACT = {
  query: { minLength: 1, maxLength: RESOURCE_LIMITS.maxQueryLength },
  limit: { minimum: 1, maximum: RESOURCE_LIMITS.maxResultCount },
  maxTerms: RESOURCE_LIMITS.maxTermCount,
  maxSnippetLength: RESOURCE_LIMITS.maxSnippetLength,
  maxCorpusEntryBytes: RESOURCE_LIMITS.maxCorpusEntryBytes,
  maxResponseBytes: RESOURCE_LIMITS.maxResponseBytes,
} as const;

export function validateResourceBounds(input: {
  query: string;
  limit: number;
  responseBytes?: number;
}): ResourceValidation {
  const query = input.query.trim();
  const terms = query ? query.split(/\s+/) : [];
  if (
    query.length < 1 ||
    query.length > RESOURCE_LIMITS.maxQueryLength ||
    terms.length > RESOURCE_LIMITS.maxTermCount
  ) {
    return {
      ok: false,
      error: {
        code: 'INVALID_QUERY',
        message: `query must contain 1-${RESOURCE_LIMITS.maxQueryLength} characters and at most ${RESOURCE_LIMITS.maxTermCount} terms`,
      },
    };
  }
  if (
    !Number.isInteger(input.limit) ||
    input.limit < 1 ||
    input.limit > RESOURCE_LIMITS.maxResultCount
  ) {
    return {
      ok: false,
      error: {
        code: 'INVALID_LIMIT',
        message: `limit must be an integer between 1 and ${RESOURCE_LIMITS.maxResultCount}`,
      },
    };
  }
  if (
    input.responseBytes !== undefined &&
    input.responseBytes > RESOURCE_LIMITS.maxResponseBytes
  ) {
    return {
      ok: false,
      error: {
        code: 'RESPONSE_TOO_LARGE',
        message: `serialized response exceeds ${RESOURCE_LIMITS.maxResponseBytes} bytes`,
      },
    };
  }
  return { ok: true };
}

export function boundedSnippet(content: string): string {
  if (content.length <= RESOURCE_LIMITS.maxSnippetLength) return content;
  return `${content.slice(0, RESOURCE_LIMITS.maxSnippetLength - 1)}…`;
}

export function assertCorpusEntryBounds(entry: unknown): void {
  const bytes = Buffer.byteLength(JSON.stringify(entry), 'utf8');
  if (bytes > RESOURCE_LIMITS.maxCorpusEntryBytes) {
    throw new Error(
      `corpus entry exceeds ${RESOURCE_LIMITS.maxCorpusEntryBytes} bytes`,
    );
  }
}

export function serializeBounded(value: unknown): string | ResourceError {
  const text = JSON.stringify(value);
  if (Buffer.byteLength(text, 'utf8') > RESOURCE_LIMITS.maxResponseBytes) {
    return {
      code: 'RESPONSE_TOO_LARGE',
      message: `serialized response exceeds ${RESOURCE_LIMITS.maxResponseBytes} bytes`,
    };
  }
  return text;
}
