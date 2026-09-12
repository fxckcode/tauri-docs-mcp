import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type ReleaseMetadata = {
  packageName: string;
  mcpName: string;
  registryName: string;
  registryPackageIdentifier: string;
  packageVersion: string;
  serverVersion: string;
  corpusSnapshot: string;
  corpusPackageVersion: string;
  registryVersion: string;
  registryPackageVersion: string;
};

const RELEASE_TAG_PATTERN = /^refs\/tags\/v(\d+\.\d+\.\d+)$/;

export function parseReleaseTag(ref: string): string {
  const match = RELEASE_TAG_PATTERN.exec(ref);
  if (!match) {
    throw new Error(
      `release ref is not an immutable semver release tag: ${ref}`,
    );
  }
  return match[1];
}

type JsonObject = Record<string, unknown>;
const root = process.cwd();
const json = async (path: string) =>
  JSON.parse(await readFile(join(root, path), 'utf8')) as JsonObject;

export async function loadReleaseMetadata(): Promise<ReleaseMetadata> {
  const [pkg, server, corpus, registry] = await Promise.all([
    json('package.json'),
    json('server.json'),
    json('corpus/manifest.json'),
    json('server.json'),
  ]);
  const packages = Array.isArray(registry.packages) ? registry.packages : [];
  const registryPackage = (packages[0] ?? {}) as JsonObject;
  return {
    packageName: String(pkg.name ?? ''),
    mcpName: String(pkg.mcpName ?? ''),
    registryName: String(server.name ?? ''),
    registryPackageIdentifier: String(registryPackage.identifier ?? ''),
    packageVersion: String(pkg.version ?? ''),
    serverVersion: String(server.version ?? ''),
    corpusSnapshot: String(corpus.snapshot ?? ''),
    corpusPackageVersion: String(corpus.packageVersion ?? ''),
    registryVersion: String(registry.version ?? ''),
    registryPackageVersion: String(registryPackage.version ?? ''),
  };
}

export function assertVersionConsistency(
  metadata: ReleaseMetadata,
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const v = metadata.packageVersion;
  if (metadata.packageName !== 'tauri-docs-mcp')
    errors.push(`package name must be tauri-docs-mcp: ${metadata.packageName}`);
  if (metadata.mcpName !== 'io.github.fxckcode/tauri-docs-mcp')
    errors.push(`package mcpName is incorrect: ${metadata.mcpName}`);
  if (metadata.registryName !== metadata.mcpName)
    errors.push(
      `registry name ${metadata.registryName} does not match package mcpName ${metadata.mcpName}`,
    );
  if (metadata.registryPackageIdentifier !== metadata.packageName)
    errors.push(
      `registry package identifier ${metadata.registryPackageIdentifier} does not match package name ${metadata.packageName}`,
    );
  if (metadata.serverVersion !== v)
    errors.push(
      `server version ${metadata.serverVersion} does not match package version ${v}`,
    );
  if (metadata.registryVersion !== v)
    errors.push(
      `registry version ${metadata.registryVersion} does not match package version ${v}`,
    );
  if (metadata.registryPackageVersion !== v)
    errors.push(
      `registry package version ${metadata.registryPackageVersion} does not match package version ${v}`,
    );
  if (metadata.corpusPackageVersion !== v)
    errors.push(
      `corpus package version ${metadata.corpusPackageVersion} does not match package version ${v}`,
    );
  if (!/^tauri-2@[A-Za-z0-9][A-Za-z0-9._-]*$/.test(metadata.corpusSnapshot))
    errors.push(`corpus snapshot is not immutable: ${metadata.corpusSnapshot}`);
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function assertExpectedVersion(
  metadata: ReleaseMetadata,
  expectedVersion: string,
): { ok: true } | { ok: false; errors: string[] } {
  return metadata.packageVersion === expectedVersion
    ? { ok: true }
    : {
        ok: false,
        errors: [
          `package version ${metadata.packageVersion} does not match release tag version ${expectedVersion}`,
        ],
      };
}

export function validateReleaseMetadata(
  metadata: ReleaseMetadata,
  expectedVersion?: string,
): { ok: true } | { ok: false; errors: string[] } {
  const consistencyResult = assertVersionConsistency(metadata);
  const expectedResult = expectedVersion
    ? assertExpectedVersion(metadata, expectedVersion)
    : { ok: true as const };
  const errors = [
    ...(consistencyResult.ok ? [] : consistencyResult.errors),
    ...(expectedResult.ok ? [] : expectedResult.errors),
  ];
  return errors.length ? { ok: false, errors } : { ok: true };
}

export async function loadConfigExamples(): Promise<JsonObject[]> {
  const names = [
    'generic.json',
    'claude-desktop.json',
    'cursor.json',
    'vscode.json',
  ];
  return Promise.all(names.map((name) => json(`examples/mcp/${name}`)));
}

export function validateConfigExamples(
  examples: JsonObject[],
  packageVersion: string,
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  for (const [index, example] of examples.entries()) {
    const servers = (example.mcpServers ?? example.servers) as
      JsonObject | undefined;
    const config = servers?.['tauri-docs'] as JsonObject | undefined;
    const args = config?.args;
    if (
      config?.command !== 'npx' ||
      !Array.isArray(args) ||
      args.join(' ') !== `--yes tauri-docs-mcp@${packageVersion}`
    )
      errors.push(
        `example ${index} must pin tauri-docs-mcp@${packageVersion} via npx`,
      );
    if (
      config &&
      Object.keys(config).some((key) => !['command', 'args'].includes(key))
    )
      errors.push(`example ${index} contains unsupported configuration`);
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

if (process.argv[1]?.endsWith('check-release-metadata.ts')) {
  const metadata = await loadReleaseMetadata();
  const examples = await loadConfigExamples();
  const exampleResult = validateConfigExamples(
    examples,
    metadata.packageVersion,
  );
  const expectedVersionIndex = process.argv.indexOf('--version');
  const expectedVersion =
    expectedVersionIndex >= 0
      ? process.argv[expectedVersionIndex + 1]
      : undefined;
  const result = validateReleaseMetadata(metadata, expectedVersion);
  const errors = [
    ...(result.ok ? [] : result.errors),
    ...(exampleResult.ok ? [] : exampleResult.errors),
  ];
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else
    console.log(
      `Release metadata is consistent at ${metadata.packageVersion}.`,
    );
}
