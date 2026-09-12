import corpus from '../corpus/tauri-2@58194ceb69424c4332b2780b196ced3a6fffb32b/index.json' with { type: 'json' };
import {
  assertCorpusEntryBounds,
  RESOURCE_LIMITS,
  validateResourceBounds,
} from './resource-limits.js';
import { retrieve } from './retrieval.js';

for (const entry of corpus.entries) assertCorpusEntryBounds(entry);

export const DEFAULT_SNAPSHOT = corpus.snapshot;
export const SUPPORTED_IDENTIFIERS = [
  'tauri',
  'tauri@2',
  DEFAULT_SNAPSHOT,
] as const;
export const RESOLVE_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    identifier: {
      type: 'string',
      minLength: 1,
      description: 'tauri, tauri@2, or an immutable snapshot identifier.',
    },
  },
  additionalProperties: false,
} as const;
export const QUERY_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      minLength: 1,
      maxLength: RESOURCE_LIMITS.maxQueryLength,
      maxTerms: RESOURCE_LIMITS.maxTermCount,
      description: 'Search terms, bounded by length and term count.',
    },
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: RESOURCE_LIMITS.maxResultCount,
      description: 'Maximum results; defaults to 5.',
    },
    snapshot: {
      type: 'string',
      minLength: 1,
      description: 'Optional supported snapshot identifier.',
    },
  },
  required: ['query'],
  additionalProperties: false,
} as const;

type ApplicationErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_QUERY'
  | 'INVALID_LIMIT'
  | 'UNSUPPORTED_SNAPSHOT'
  | 'RESPONSE_TOO_LARGE';

export type ApplicationError = {
  code: ApplicationErrorCode;
  message: string;
  supported?: readonly string[];
};

type Validation<T> =
  { ok: true; value: T } | { ok: false; error: ApplicationError };

export type ResolveInput = { identifier?: string };
export type ResolvedSnapshot = {
  snapshot: string;
  generatedAt: string;
  sourceRepository: string;
  sourceRevision: string;
  entryCount: number;
  version: 'Tauri 2';
  versionSensitive: true;
};

export type QueryInput = { query: string; limit?: number; snapshot?: string };
export type QueryResult = {
  title: string;
  heading: string;
  section: string;
  url: string;
  anchor?: string;
  content: string;
  corpusSnapshot: string;
  sourceRevision: string;
  version: 'Tauri 2';
  versionSensitive: true;
  matches?: string[];
};

const invalidInput = (message: string): Validation<never> => ({
  ok: false,
  error: { code: 'INVALID_INPUT', message },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnly(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

export function validateResolveInput(input: unknown): Validation<ResolveInput> {
  if (input === undefined) return { ok: true, value: {} };
  if (!isRecord(input) || !hasOnly(input, ['identifier']))
    return invalidInput('resolver input only supports an optional identifier');
  if (input.identifier !== undefined && typeof input.identifier !== 'string')
    return invalidInput('identifier must be a string');
  if (
    typeof input.identifier === 'string' &&
    input.identifier.trim().length === 0
  )
    return invalidInput('identifier must not be empty');
  return { ok: true, value: { identifier: input.identifier } };
}

export function resolveSnapshot(
  input: ResolveInput,
): Validation<ResolvedSnapshot> {
  const identifier = input.identifier?.trim() || 'tauri';
  if (!(SUPPORTED_IDENTIFIERS as readonly string[]).includes(identifier)) {
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_SNAPSHOT',
        message: `unsupported Tauri documentation snapshot: ${identifier}`,
        supported: [...SUPPORTED_IDENTIFIERS],
      },
    };
  }
  return {
    ok: true,
    value: {
      snapshot: DEFAULT_SNAPSHOT,
      generatedAt: corpus.generatedAt,
      sourceRepository: 'https://github.com/tauri-apps/tauri-docs',
      sourceRevision: corpus.sourceRevision,
      entryCount: corpus.entries.length,
      version: 'Tauri 2',
      versionSensitive: true,
    },
  };
}

export function validateQueryInput(
  input: unknown,
): Validation<{ query: string; limit: number; snapshot?: string }> {
  if (!isRecord(input) || !hasOnly(input, ['query', 'limit', 'snapshot']))
    return invalidInput('query input supports query, limit, and snapshot only');
  if (
    typeof input.query !== 'string' ||
    input.query.trim().length < 1 ||
    input.query.trim().length > RESOURCE_LIMITS.maxQueryLength
  )
    return {
      ok: false,
      error: {
        code: 'INVALID_QUERY',
        message: `query must contain 1-${RESOURCE_LIMITS.maxQueryLength} non-whitespace characters`,
      },
    };
  const limit = input.limit ?? 5;
  if (
    typeof limit !== 'number' ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > RESOURCE_LIMITS.maxResultCount
  )
    return {
      ok: false,
      error: {
        code: 'INVALID_LIMIT',
        message: `limit must be an integer between 1 and ${RESOURCE_LIMITS.maxResultCount}`,
      },
    };
  if (input.snapshot !== undefined && typeof input.snapshot !== 'string')
    return invalidInput('snapshot must be a string');
  if (typeof input.snapshot === 'string' && input.snapshot.trim().length === 0)
    return invalidInput('snapshot must not be empty');
  const resourceValidation = validateResourceBounds({
    query: input.query,
    limit,
  });
  if (!resourceValidation.ok)
    return {
      ok: false,
      error: {
        code: resourceValidation.error.code as ApplicationErrorCode,
        message: resourceValidation.error.message,
      },
    };
  return {
    ok: true,
    value: {
      query: input.query.trim(),
      limit,
      snapshot: input.snapshot?.trim(),
    },
  };
}

export function queryDocs(input: {
  query: string;
  limit: number;
  snapshot?: string;
}): { snapshot: string; results: QueryResult[] } {
  const resolved = resolveSnapshot({ identifier: input.snapshot });
  if (!resolved.ok) throw new Error(resolved.error.message);
  const results = retrieve(corpus.entries, input.query, input.limit).map(
    ({ document: entry, matches, snippet }) => ({
      title: entry.title,
      heading: entry.section.split(' > ').at(-1) ?? entry.title,
      section: entry.section,
      url: entry.url,
      anchor: new URL(entry.url).pathname.split('/').filter(Boolean).at(-1),
      content: snippet,
      corpusSnapshot: corpus.snapshot,
      sourceRevision: entry.sourceRevision,
      version: 'Tauri 2' as const,
      versionSensitive: true as const,
      matches,
    }),
  );
  return { snapshot: corpus.snapshot, results };
}
