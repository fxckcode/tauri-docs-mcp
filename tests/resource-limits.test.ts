import { describe, expect, it } from 'vitest';
import {
  assertCorpusEntryBounds,
  boundedSnippet,
  RESOURCE_LIMITS,
  serializeBounded,
  validateResourceBounds,
} from '../src/resource-limits.js';

describe('resource limits', () => {
  it('publishes one explicit contract for schemas and runtime validation', () => {
    expect(RESOURCE_LIMITS).toEqual({
      maxQueryLength: 200,
      maxTermCount: 16,
      maxResultCount: 10,
      maxSnippetLength: 1200,
      maxCorpusEntryBytes: 8192,
      maxResponseBytes: 32768,
      maxStdioFrameBytes: 65536,
      shutdownTimeoutMs: 1000,
    });
  });

  it('rejects queries with too many terms', () => {
    const query = Array.from({ length: 17 }, (_, i) => `term${i}`).join(' ');
    expect(validateResourceBounds({ query, limit: 1 })).toMatchObject({
      ok: false,
      error: { code: 'INVALID_QUERY' },
    });
  });

  it('rejects result and response bounds and accepts exact boundaries', () => {
    expect(validateResourceBounds({ query: 'x', limit: 10 })).toMatchObject({
      ok: true,
    });
    expect(validateResourceBounds({ query: 'x', limit: 11 })).toMatchObject({
      ok: false,
      error: { code: 'INVALID_LIMIT' },
    });
    expect(
      validateResourceBounds({ query: 'x', limit: 1, responseBytes: 32768 }),
    ).toMatchObject({ ok: true });
    expect(
      validateResourceBounds({ query: 'x', limit: 1, responseBytes: 32769 }),
    ).toMatchObject({
      ok: false,
      error: { code: 'RESPONSE_TOO_LARGE' },
    });
  });

  it('bounds snippets, corpus entries, and serialized responses by UTF-8 bytes', () => {
    expect(
      boundedSnippet('x'.repeat(RESOURCE_LIMITS.maxSnippetLength + 1)),
    ).toHaveLength(RESOURCE_LIMITS.maxSnippetLength);
    expect(() =>
      assertCorpusEntryBounds('x'.repeat(RESOURCE_LIMITS.maxCorpusEntryBytes)),
    ).toThrow(/corpus entry exceeds/);
    expect(serializeBounded({ value: 'x'.repeat(40_000) })).toMatchObject({
      code: 'RESPONSE_TOO_LARGE',
    });
  });
});
