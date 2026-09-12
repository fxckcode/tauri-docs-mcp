import generatedCorpus from '../corpus/tauri-2@58194ceb69424c4332b2780b196ced3a6fffb32b/index.json' with { type: 'json' };

export type DocEntry = {
  title: string;
  url: string;
  section: string;
  context: string;
  version: 'Tauri 2';
  versionSensitive: boolean;
  keywords: string[];
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
    typeof (input as Record<string, unknown>).query !== 'string'
  ) {
    return {
      ok: false,
      error: {
        code: 'INVALID_QUERY',
        message: 'query must contain 1-200 non-whitespace characters',
      },
    };
  }
  const value = input as Record<string, unknown>;
  const query = (value.query as string).trim();
  if (query.length < 1 || query.length > 200) {
    return {
      ok: false,
      error: {
        code: 'INVALID_QUERY',
        message: 'query must contain 1-200 non-whitespace characters',
      },
    };
  }
  const limit = value.limit ?? 5;
  if (
    typeof limit !== 'number' ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 10
  ) {
    return {
      ok: false,
      error: {
        code: 'INVALID_LIMIT',
        message: 'limit must be an integer between 1 and 10',
      },
    };
  }
  return { ok: true, value: { query, limit } };
}

export function searchDocs(input: SearchInput): DocEntry[] {
  const validation = validateSearchInput(input);
  if (!validation.ok) throw new Error(validation.error.message);
  const terms = validation.value.query.toLowerCase().split(/\s+/);
  return DOC_INDEX.map((entry, index) => {
    const title = entry.title.toLowerCase();
    const searchable = [title, entry.section, entry.context, ...entry.keywords]
      .join(' ')
      .toLowerCase();
    const score = terms.reduce(
      (total, term) =>
        total +
        (title === term ? 100 : title.includes(term) ? 50 : 0) +
        (entry.keywords.includes(term) ? 30 : 0) +
        (searchable.includes(term) ? 5 : 0),
      0,
    );
    return { entry, score, index };
  })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, validation.value.limit)
    .map(({ entry }) => entry);
}
