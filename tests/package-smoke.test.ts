import { describe, expect, it } from 'vitest';
import { assertPackContents } from '../scripts/package-smoke.js';

describe('package smoke contract', () => {
  it('accepts the runtime allowlist and rejects source or metadata leaks', () => {
    const allowed = [
      'package.json',
      'LICENSE',
      'README.md',
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
    ];

    expect(() => assertPackContents(allowed)).not.toThrow();
    expect(() => assertPackContents([...allowed, 'src/server.ts'])).toThrow(
      /unexpected package files/,
    );
  });
});
