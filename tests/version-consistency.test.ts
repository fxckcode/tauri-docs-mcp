import { describe, expect, it } from 'vitest';
import {
  assertExpectedVersion,
  assertVersionConsistency,
  loadReleaseMetadata,
  validateReleaseMetadata,
  parseReleaseTag,
} from '../scripts/check-release-metadata.js';

describe('release metadata contract', () => {
  it('keeps package, server, corpus, and registry versions aligned', async () => {
    const metadata = await loadReleaseMetadata();
    expect(assertVersionConsistency(metadata)).toEqual({ ok: true });
  });

  it('derives and validates immutable release versions from tags', () => {
    expect(parseReleaseTag('refs/tags/v1.2.3')).toBe('1.2.3');
    expect(() => parseReleaseTag('refs/heads/main')).toThrow(
      /immutable semver release tag/,
    );
    expect(
      assertExpectedVersion(
        {
          packageName: 'tauri-docs-mcp',
          mcpName: 'io.github.fxckcode/tauri-docs-mcp',
          registryName: 'io.github.fxckcode/tauri-docs-mcp',
          registryPackageIdentifier: 'tauri-docs-mcp',
          packageVersion: '1.2.3',
          serverVersion: '1.2.3',
          corpusSnapshot: 'tauri-2@revision',
          corpusPackageVersion: '1.2.3',
          registryVersion: '1.2.3',
          registryPackageVersion: '1.2.3',
        },
        '1.2.4',
      ),
    ).toEqual({
      ok: false,
      errors: [
        'package version 1.2.3 does not match release tag version 1.2.4',
      ],
    });
  });

  it('rejects a non-package drift when the release tag version matches', () => {
    const metadata = {
      packageName: 'tauri-docs-mcp',
      mcpName: 'io.github.fxckcode/tauri-docs-mcp',
      registryName: 'io.github.fxckcode/tauri-docs-mcp',
      registryPackageIdentifier: 'tauri-docs-mcp',
      packageVersion: '1.2.3',
      serverVersion: '1.2.4',
      corpusSnapshot: 'tauri-2@revision',
      corpusPackageVersion: '1.2.3',
      registryVersion: '1.2.3',
      registryPackageVersion: '1.2.3',
    };

    expect(validateReleaseMetadata(metadata, '1.2.3')).toEqual({
      ok: false,
      errors: ['server version 1.2.4 does not match package version 1.2.3'],
    });
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
