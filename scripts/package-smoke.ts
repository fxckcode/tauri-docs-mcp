import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const EXPECTED_FILES = new Set([
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
  'dist/corpus/tauri-2@58194ceb69424c4332b2780b196ced3a6fffb32b/index.json',
  'corpus/manifest.json',
  'corpus/NOTICES.md',
  'corpus/tauri-2@58194ceb69424c4332b2780b196ced3a6fffb32b/index.json',
]);

export function assertPackContents(files: readonly string[]): void {
  const unexpected = files.filter((file) => !EXPECTED_FILES.has(file));
  const missing = [...EXPECTED_FILES].filter((file) => !files.includes(file));
  if (unexpected.length || missing.length) {
    throw new Error(
      `unexpected package files: ${unexpected.join(', ') || 'none'}; missing: ${missing.join(', ') || 'none'}`,
    );
  }
}

function packedFiles(tarball: string): string[] {
  const listing = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' });
  return listing
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((file) => file.replace(/^package\//, '').replace(/\/$/, ''))
    .filter(Boolean);
}

type RpcResponse = {
  id: number;
  result?: {
    serverInfo?: { name: string };
    tools?: Array<{ name: string }>;
    isError?: boolean;
    content?: Array<{ text: string }>;
  };
  error?: { message: string };
};

async function request(
  proc: ReturnType<typeof spawn>,
  message: object,
  id: number,
): Promise<RpcResponse> {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => {
      proc.stdout?.off('data', onData);
      reject(new Error(`timed out waiting for JSON-RPC response ${id}`));
    }, 10_000);
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const newline = buffer.indexOf('\n');
      if (newline < 0) return;
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      if (!line.trim()) return;
      clearTimeout(timer);
      proc.stdout?.off('data', onData);
      try {
        resolve(JSON.parse(line) as RpcResponse);
      } catch (error) {
        reject(error);
      }
    };
    proc.stdout?.on('data', onData);
    proc.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    proc.stdin?.write(`${JSON.stringify(message)}\n`);
  });
}

async function main(): Promise<void> {
  const tarball = process.argv[2];
  if (!tarball)
    throw new Error('usage: tsx scripts/package-smoke.ts <tarball>');
  const tarballPath = resolve(tarball);
  assertPackContents(packedFiles(tarballPath));

  const installDir = await mkdtemp(join(tmpdir(), 'tauri-docs-mcp-smoke-'));
  execFileSync(
    'npm',
    ['install', '--ignore-scripts', '--no-save', tarballPath],
    {
      cwd: installDir,
      stdio: 'inherit',
    },
  );
  const proc = spawn(join(installDir, 'node_modules/.bin/tauri-docs-mcp'), [], {
    cwd: installDir,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  try {
    const initialized = await request(
      proc,
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'package-smoke', version: '1' },
        },
      },
      1,
    );
    if (initialized.result?.serverInfo?.name !== 'tauri-docs-mcp') {
      throw new Error('MCP initialization returned the wrong server identity');
    }
    proc.stdin?.write(
      `${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })}\n`,
    );

    const tools = await request(
      proc,
      { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
      2,
    );
    if (
      tools.result?.tools?.map((tool) => tool.name).join() !==
      'resolve_tauri_docs,query_tauri_docs,search_tauri_docs'
    ) {
      throw new Error('tools/list did not expose search_tauri_docs');
    }

    const valid = await request(
      proc,
      {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'query_tauri_docs',
          arguments: { query: 'window', limit: 1 },
        },
      },
      3,
    );
    const validText = valid.result?.content?.[0]?.text;
    if (
      valid.result?.isError ||
      !validText ||
      !JSON.parse(validText).results?.length
    ) {
      throw new Error('valid query smoke flow failed');
    }

    const invalid = await request(
      proc,
      {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'search_tauri_docs',
          arguments: { query: 'ipc', limit: 11 },
        },
      },
      4,
    );
    const invalidText = invalid.result?.content?.[0]?.text;
    if (
      !invalid.result?.isError ||
      !invalidText ||
      JSON.parse(invalidText).error?.code !== 'INVALID_LIMIT'
    ) {
      throw new Error('invalid-input smoke flow failed');
    }
    console.log('Package contents and stdio MCP smoke test passed.');
  } finally {
    proc.kill();
    await rm(installDir, { recursive: true, force: true });
  }
}

if (process.argv[1]?.endsWith('package-smoke.ts')) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
