import { describe, expect, it } from 'vitest';
import { assertPackContents } from '../scripts/package-smoke.js';

describe('package smoke contract', () => {
  it('accepts the runtime allowlist and rejects source or metadata leaks', () => {
    const allowed = [
      'package.json',
      'LICENSE',
      'README.md',
      'dist/package.json',
      'dist/src/index.js',
      'dist/src/index.js.map',
      'dist/src/index.d.ts',
      'dist/src/index.d.ts.map',
      'dist/src/search.js',
      'dist/src/search.js.map',
      'dist/src/search.d.ts',
      'dist/src/search.d.ts.map',
      'dist/src/server.js',
      'dist/src/server.js.map',
      'dist/src/server.d.ts',
      'dist/src/server.d.ts.map',
      'dist/src/corpus.js',
      'dist/src/corpus.js.map',
      'dist/src/corpus.d.ts',
      'dist/src/corpus.d.ts.map',
      'dist/src/resolver-query.js',
      'dist/src/resolver-query.js.map',
      'dist/src/resolver-query.d.ts',
      'dist/src/resolver-query.d.ts.map',
      'dist/src/lifecycle.js',
      'dist/src/lifecycle.js.map',
      'dist/src/lifecycle.d.ts',
      'dist/src/lifecycle.d.ts.map',
      'dist/src/resource-limits.js',
      'dist/src/resource-limits.js.map',
      'dist/src/resource-limits.d.ts',
      'dist/src/resource-limits.d.ts.map',
      'dist/src/retrieval.js',
      'dist/src/retrieval.js.map',
      'dist/src/retrieval.d.ts',
      'dist/src/retrieval.d.ts.map',
      'dist/corpus/tauri-2@58194ceb69424c4332b2780b196ced3a6fffb32b/index.json',
      'corpus/manifest.json',
      'corpus/NOTICES.md',
      'corpus/tauri-2@58194ceb69424c4332b2780b196ced3a6fffb32b/index.json',
    ];

    expect(() => assertPackContents(allowed)).not.toThrow();
    expect(() => assertPackContents([...allowed, 'src/server.ts'])).toThrow(
      /unexpected package files/,
    );
  });
});
