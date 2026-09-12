import { describe, expect, it } from 'vitest';
import {
  generateCorpus,
  validateManifest,
  type CorpusManifest,
} from '../src/corpus.js';

const validManifest: CorpusManifest = {
  snapshot: 'tauri-2@test-revision',
  generatedAt: '2026-09-11T00:00:00.000Z',
  sourceRepository: 'https://github.com/tauri-apps/tauri-docs',
  sourceLicense: 'MIT',
  entries: [
    {
      url: 'https://v2.tauri.app/security/capabilities/',
      title: 'Capabilities',
      section: ['Security', 'Capabilities'],
      version: 'Tauri 2',
      sourceRevision: 'test-revision',
      fetchedAt: '2026-09-10T00:00:00.000Z',
      content: 'Define permissions and scopes for Tauri 2 applications.',
      contentHash:
        'sha256:de1e0733807882f984d71ef4b52a35e1980636b7381cc41f70d8d2c540f820cb',
      keywords: ['capabilities', 'permissions'],
    },
  ],
};

describe('corpus pipeline', () => {
  it('accepts an approved manifest and emits stable generated JSON', () => {
    expect(validateManifest(validManifest)).toEqual({ ok: true });
    expect(generateCorpus(validManifest)).toEqual({
      generated: true,
      snapshot: 'tauri-2@test-revision',
      entries: [
        {
          title: 'Capabilities',
          url: 'https://v2.tauri.app/security/capabilities/',
          section: 'Security > Capabilities',
          context: 'Define permissions and scopes for Tauri 2 applications.',
          version: 'Tauri 2',
          versionSensitive: true,
          keywords: ['capabilities', 'permissions'],
        },
      ],
    });
  });

  it('rejects unsafe, duplicate, incomplete, and hash-mismatched records', () => {
    const bad = {
      ...validManifest,
      entries: [
        validManifest.entries[0],
        {
          ...validManifest.entries[0],
          url: 'http://example.com/not-approved',
          title: '',
          content: ' ',
          contentHash: 'sha256:wrong',
          sourceRevision: '',
          fetchedAt: '',
        },
      ],
    };
    const result = validateManifest(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('HTTPS'),
          expect.stringContaining('allowlist'),
          expect.stringContaining('title'),
          expect.stringContaining('content'),
          expect.stringContaining('hash'),
          expect.stringContaining('sourceRevision'),
          expect.stringContaining('fetchedAt'),
        ]),
      );
    }

    expect(
      validateManifest({
        ...validManifest,
        entries: [validManifest.entries[0], validManifest.entries[0]],
      }),
    ).toMatchObject({ ok: false });
  });

  it('rejects mutable or malformed snapshot identifiers', () => {
    expect(
      validateManifest({ ...validManifest, snapshot: 'tauri-2' }),
    ).toMatchObject({ ok: false });
    expect(
      validateManifest({ ...validManifest, snapshot: 'tauri-2@' }),
    ).toMatchObject({ ok: false });
  });
});
