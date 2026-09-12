import generatedCorpus from '../corpus/tauri-2@58194ceb69424c4332b2780b196ced3a6fffb32b/index.json' with { type: 'json' };
import {
  assertCorpusEntryBounds,
  RESOURCE_LIMITS,
  validateResourceBounds,
} from './resource-limits.js';
import { retrieve } from './retrieval.js';

for (const entry of generatedCorpus.entries) assertCorpusEntryBounds(entry);

export type DocEntry = {
  title: string;
  url: string;
  section: string;
  context: string;
  version: 'Tauri 2';
  versionSensitive: boolean;
  keywords: string[];
  matches?: string[];
};

export const DOC_INDEX: readonly DocEntry[] = generatedCorpus.entries.map(
  (entry) => ({
    ...entry,
    version: 'Tauri 2' as const,
    versionSensitive: true as const,
  }),
);

export type SearchInput = { query: string; limit?: number };
export type SearchError = {
  code: 'INVALID_QUERY' | 'INVALID_LIMIT';
  message: string;
};
export type SearchValidation =
  | { ok: true; value: { query: string; limit: number } }
  | { ok: false; error: SearchError };

export function validateSearchInput(input: unknown): SearchValidation {
  if (
    !input ||
    typeof input !== 'object' ||
    typeof (input as Record<string, unknown>).query !== 'string' ||
    Object.keys(input as object).some(
      (key) => !['query', 'limit'].includes(key),
    )
  ) {
    return {
      ok: false,
      error: {
        code: 'INVALID_QUERY',
        message: `query must contain 1-${RESOURCE_LIMITS.maxQueryLength} non-whitespace characters`,
      },
    };
  }
  const value = input as Record<string, unknown>;
  const query = (value.query as string).trim();
  if (query.length < 1 || query.length > RESOURCE_LIMITS.maxQueryLength) {
    return {
      ok: false,
      error: {
        code: 'INVALID_QUERY',
        message: `query must contain 1-${RESOURCE_LIMITS.maxQueryLength} non-whitespace characters`,
      },
    };
  }
  const limit = value.limit ?? 5;
  if (
    typeof limit !== 'number' ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > RESOURCE_LIMITS.maxResultCount
  ) {
    return {
      ok: false,
      error: {
        code: 'INVALID_LIMIT',
        message: `limit must be an integer between 1 and ${RESOURCE_LIMITS.maxResultCount}`,
      },
    };
  }
  const resourceValidation = validateResourceBounds({ query, limit });
  if (!resourceValidation.ok)
    return {
      ok: false,
      error: {
        code: resourceValidation.error.code as SearchError['code'],
        message: resourceValidation.error.message,
      },
    };
  return { ok: true, value: { query, limit } };
}

export function searchDocs(input: SearchInput): DocEntry[] {
  const validation = validateSearchInput(input);
  if (!validation.ok) throw new Error(validation.error.message);
  return retrieve(
    DOC_INDEX,
    validation.value.query,
    validation.value.limit,
  ).map(({ document, matches }) => ({ ...document, matches }));
}
