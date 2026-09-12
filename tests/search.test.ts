import { describe, expect, it } from 'vitest';
import { DOC_INDEX, searchDocs, validateSearchInput } from '../src/search.js';

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

  it('keeps every indexed URL on the live official Tauri 2 documentation site', async () => {
    const statuses = await Promise.all(
      DOC_INDEX.map(async (entry) => ({
        url: entry.url,
        status: (await fetch(entry.url)).status,
      })),
    );

    expect(statuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: 'https://v2.tauri.app/learn/window-customization/',
          status: 200,
        }),
      ]),
    );
    expect(statuses.every(({ status }) => status >= 200 && status < 400)).toBe(
      true,
    );
  });
});
