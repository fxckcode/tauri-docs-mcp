import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { describe, expect, it } from 'vitest';

type JsonRpcResponse = {
  result: {
    serverInfo?: { name: string; version: string };
    isError?: boolean;
    tools?: Array<{ name: string; annotations?: Record<string, unknown> }>;
    content?: Array<{ text: string }>;
  };
};

function send(
  proc: ReturnType<typeof spawn>,
  message: object,
): Promise<JsonRpcResponse> {
  return new Promise((resolve, reject) => {
    const onData = (chunk: Buffer) => {
      for (const line of chunk.toString().split('\n')) {
        if (!line.trim()) continue;
        proc.stdout?.off('data', onData);
        resolve(JSON.parse(line));
        return;
      }
    };
    proc.stdout?.on('data', onData);
    proc.once('error', reject);
    proc.stdin?.write(`${JSON.stringify(message)}\n`);
  });
}

async function start() {
  const proc = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  await send(proc, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'test', version: '1' },
    },
  });
  proc.stdin?.write(
    `${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })}\n`,
  );
  return proc;
}

async function stop(proc: ReturnType<typeof spawn>) {
  proc.kill();
  await once(proc, 'exit');
}

function body(response: JsonRpcResponse) {
  return JSON.parse(response.result.content![0].text) as Record<
    string,
    unknown
  >;
}

function results(response: JsonRpcResponse): Array<Record<string, unknown>> {
  return body(response).results as Array<Record<string, unknown>>;
}

function errorCode(response: JsonRpcResponse): unknown {
  return (body(response).error as Record<string, unknown>).code;
}

describe('stdio transport', () => {
  it('initializes and calls search_tauri_docs over real stdio', async () => {
    const proc = await start();
    const response = await send(proc, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'search_tauri_docs',
        arguments: { query: 'window', limit: 1 },
      },
    });
    expect(response.result.isError).not.toBe(true);
    expect(results(response)[0].url).toContain('v2.tauri.app');
    await stop(proc);
  });

  it('returns the structured application error for an oversized limit', async () => {
    const proc = await start();
    const response = await send(proc, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'search_tauri_docs',
        arguments: { query: 'ipc', limit: 11 },
      },
    });
    expect(response.result.isError).toBe(true);
    expect(body(response)).toEqual({
      error: {
        code: 'INVALID_LIMIT',
        message: 'limit must be an integer between 1 and 10',
      },
    });
    await stop(proc);
  });

  it('exposes and exercises the resolver/query contract end to end', async () => {
    const proc = await start();
    const listed = await send(proc, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    });
    expect(listed.result.tools?.map((tool) => tool.name)).toEqual([
      'resolve_tauri_docs',
      'query_tauri_docs',
      'search_tauri_docs',
    ]);
    expect(listed.result.tools?.[0].annotations).toMatchObject({
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
    });

    const defaultResolved = await send(proc, {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'resolve_tauri_docs', arguments: {} },
    });
    expect(defaultResolved.result.isError).not.toBe(true);
    expect(body(defaultResolved).snapshot).toBeDefined();

    const explicit = await send(proc, {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'resolve_tauri_docs',
        arguments: { identifier: 'tauri@2' },
      },
    });
    expect(body(explicit).version).toBe('Tauri 2');

    const unsupported = await send(proc, {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'resolve_tauri_docs',
        arguments: { identifier: 'tauri@1' },
      },
    });
    expect(unsupported.result.isError).toBe(true);
    expect(errorCode(unsupported)).toBe('UNSUPPORTED_SNAPSHOT');

    const valid = await send(proc, {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'query_tauri_docs',
        arguments: { query: 'window', snapshot: 'tauri@2', limit: 1 },
      },
    });
    expect(results(valid)[0]).toMatchObject({
      title: 'Window Customization',
      corpusSnapshot: expect.any(String),
    });

    const empty = await send(proc, {
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'query_tauri_docs',
        arguments: { query: 'absent-from-corpus' },
      },
    });
    expect(empty.result.isError).not.toBe(true);
    expect(results(empty)).toEqual([]);

    const invalid = await send(proc, {
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: {
        name: 'query_tauri_docs',
        arguments: { query: 'ipc', extra: true },
      },
    });
    expect(invalid.result.isError).toBe(true);
    expect(errorCode(invalid)).toBe('INVALID_INPUT');

    const legacy = await send(proc, {
      jsonrpc: '2.0',
      id: 9,
      method: 'tools/call',
      params: {
        name: 'search_tauri_docs',
        arguments: { query: 'ipc', limit: 1 },
      },
    });
    expect(legacy.result.isError).not.toBe(true);
    expect(results(legacy)[0].title).toBe('IPC');
    await stop(proc);
  });
});
