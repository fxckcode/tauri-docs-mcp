import { describe, expect, it } from 'vitest';
import {
  queryDocs,
  resolveSnapshot,
  validateQueryInput,
  validateResolveInput,
} from '../src/resolver-query.js';

describe('snapshot resolution', () => {
  it('resolves default and supported identifiers deterministically', () => {
    expect(resolveSnapshot({})).toMatchObject({
      ok: true,
      value: {
        snapshot: 'tauri-2@58194ceb69424c4332b2780b196ced3a6fffb32b',
        version: 'Tauri 2',
        sourceRevision: '58194ceb69424c4332b2780b196ced3a6fffb32b',
      },
    });
    expect(resolveSnapshot({ identifier: 'tauri@2' })).toMatchObject({
      ok: true,
      value: { snapshot: 'tauri-2@58194ceb69424c4332b2780b196ced3a6fffb32b' },
    });
    expect(resolveSnapshot({ identifier: 'tauri' })).toMatchObject({
      ok: true,
    });
  });

  it('returns a stable unsupported snapshot error', () => {
    expect(resolveSnapshot({ identifier: 'tauri@1' })).toEqual({
      ok: false,
      error: {
        code: 'UNSUPPORTED_SNAPSHOT',
        message: 'unsupported Tauri documentation snapshot: tauri@1',
        supported: [
          'tauri',
          'tauri@2',
          'tauri-2@58194ceb69424c4332b2780b196ced3a6fffb32b',
        ],
      },
    });
  });
});

describe('content query', () => {
  it('returns bounded content metadata from the selected snapshot', () => {
    const input = validateQueryInput({
      query: 'window',
      limit: 1,
      snapshot: 'tauri@2',
    });
    expect(input).toMatchObject({ ok: true });
    if (!input.ok) return;
    const result = queryDocs(input.value);
    expect(result).toMatchObject({
      snapshot: 'tauri-2@58194ceb69424c4332b2780b196ced3a6fffb32b',
      results: [
        {
          title: 'Window Customization',
          heading: 'Window Customization',
          section: 'Learn > Window Customization',
          url: 'https://v2.tauri.app/learn/window-customization/',
          content: 'Configure native windows, decorations, size, and behavior.',
          corpusSnapshot: 'tauri-2@58194ceb69424c4332b2780b196ced3a6fffb32b',
          sourceRevision: '58194ceb69424c4332b2780b196ced3a6fffb32b',
          version: 'Tauri 2',
          versionSensitive: true,
        },
      ],
    });
  });

  it('distinguishes empty results and rejects unknown fields', () => {
    expect(
      queryDocs({ query: 'not-in-corpus', limit: 5, snapshot: undefined }),
    ).toMatchObject({
      results: [],
    });
    expect(validateQueryInput({ query: 'ipc', nope: true })).toMatchObject({
      ok: false,
      error: { code: 'INVALID_INPUT' },
    });
  });
});

it('validates resolver input strictly', () => {
  expect(validateResolveInput({ identifier: 2 })).toMatchObject({
    ok: false,
    error: { code: 'INVALID_INPUT' },
  });
});
