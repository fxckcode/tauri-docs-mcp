import { describe, expect, it } from 'vitest';
import { DOC_INDEX, searchDocs, validateSearchInput } from '../src/search.js';
import { retrieve, type RetrievalDocument } from '../src/retrieval.js';

const adversarialDocument: RetrievalDocument = {
  title: 'Generic',
  section: 'Guide > Generic',
  context: 'ordinary body',
  keywords: ['alias'],
  url: 'https://v2.tauri.app/unique-anchor/',
};

describe('search_tauri_docs search logic', () => {
  it('ranks exact title matches before contextual matches and returns bounded canonical results', () => {
    const results = searchDocs({ query: 'capabilities', limit: 2 });

    expect(results.length).toBeLessThanOrEqual(2);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toMatchObject({
      title: 'Capabilities',
      url: 'https://v2.tauri.app/security/capabilities/',
      version: 'Tauri 2',
      versionSensitive: true,
    });
    expect(
      results.every(
        (result) => new URL(result.url).hostname === 'v2.tauri.app',
      ),
    ).toBe(true);
  });

  it('rejects empty queries and limits above the safe maximum', () => {
    expect(validateSearchInput({ query: '' })).toEqual({
      ok: false,
      error: {
        code: 'INVALID_QUERY',
        message: 'query must contain 1-200 non-whitespace characters',
      },
    });
    expect(validateSearchInput({ query: 'ipc', limit: 11 })).toEqual({
      ok: false,
      error: {
        code: 'INVALID_LIMIT',
        message: 'limit must be an integer between 1 and 10',
      },
    });
  });

  it('keeps every indexed URL on the checked-in official Tauri 2 corpus', () => {
    expect(DOC_INDEX).toHaveLength(10);
    expect(
      DOC_INDEX.every(
        (entry) => new URL(entry.url).hostname === 'v2.tauri.app',
      ),
    ).toBe(true);
  });

  it('normalizes punctuation, deduplicates terms, and prefers an exact phrase in a heading', () => {
    const results = searchDocs({
      query: 'TAURI.CONF.JSON tauri-conf-json',
      limit: 3,
    });
    expect(results[0]).toMatchObject({ title: 'Configuration' });
    expect(results[0].matches).toEqual(
      expect.arrayContaining(['phrase', 'alias']),
    );
  });

  it('searches aliases and code identifiers without relying on corpus insertion order', () => {
    expect(searchDocs({ query: 'src-tauri', limit: 1 })[0].title).toBe(
      'Project Structure',
    );
    expect(searchDocs({ query: 'tauri.conf.json', limit: 1 })[0].title).toBe(
      'Configuration',
    );
    const urls = searchDocs({ query: 'commands invoke', limit: 3 }).map(
      (x) => x.url,
    );
    expect(
      searchDocs({ query: 'commands invoke', limit: 3 }).map((x) => x.url),
    ).toEqual(urls);
  });

  it('returns no results for punctuation-only or unknown terms', () => {
    expect(searchDocs({ query: '!!!', limit: 5 })).toEqual([]);
    expect(searchDocs({ query: 'not-in-corpus', limit: 5 })).toEqual([]);
  });

  it('finds normalized URL path and anchor tokens without fetching the URL', () => {
    expect(retrieve([adversarialDocument], 'unique-anchor', 10)).toHaveLength(
      1,
    );
    expect(retrieve([adversarialDocument], 'v2.tauri.app', 10)).toHaveLength(1);
  });

  it('keeps weak substring matches as lower-ranked fallback results', () => {
    const exact: RetrievalDocument = {
      ...adversarialDocument,
      title: 'Configuration',
      url: 'https://v2.tauri.app/config/',
    };
    const weak: RetrievalDocument = {
      ...adversarialDocument,
      title: 'Generic',
      context: 'configuration details',
      url: 'https://v2.tauri.app/other/',
    };
    const results = retrieve([weak, exact], 'configur', 10);
    expect(results).toHaveLength(2);
    expect(results[0].document.title).toBe('Configuration');
    expect(results[1].document.title).toBe('Generic');
  });
});
