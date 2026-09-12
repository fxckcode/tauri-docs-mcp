import { describe, expect, it } from 'vitest';
import {
  assertVersionConsistency,
  loadReleaseMetadata,
} from '../scripts/check-release-metadata.js';

describe('release metadata contract', () => {
  it('keeps package, server, corpus, and registry versions aligned', async () => {
    const metadata = await loadReleaseMetadata();
    expect(assertVersionConsistency(metadata)).toEqual({ ok: true });
  });

  it('reports every mismatched authoritative version', () => {
    const metadata = {
      packageName: 'tauri-docs-mcp',
      mcpName: 'io.github.fxckcode/tauri-docs-mcp',
      registryName: 'io.github.fxckcode/tauri-docs-mcp',
      registryPackageIdentifier: 'tauri-docs-mcp',
      packageVersion: '0.2.0',
      serverVersion: '0.1.0',
      corpusSnapshot: 'tauri-2@revision',
      corpusPackageVersion: '0.1.0',
      registryVersion: '0.1.0',
      registryPackageVersion: '0.2.0',
    };
    expect(assertVersionConsistency(metadata)).toEqual({
      ok: false,
      errors: [
        'server version 0.1.0 does not match package version 0.2.0',
        'registry version 0.1.0 does not match package version 0.2.0',
        'corpus package version 0.1.0 does not match package version 0.2.0',
      ],
    });
  });
});
