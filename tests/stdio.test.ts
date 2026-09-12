import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { describe, expect, it } from 'vitest';

type JsonRpcResponse = {
  result: {
    serverInfo?: { name: string; version: string };
    isError?: boolean;
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

describe('stdio transport', () => {
  it('initializes and calls search_tauri_docs over real stdio', async () => {
    const proc = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const initialized = await send(proc, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'test', version: '1' },
      },
    });
    expect(initialized.result.serverInfo!.name).toBe('tauri-docs-mcp');

    proc.stdin?.write(
      `${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })}\n`,
    );
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
    expect(
      JSON.parse(response.result.content![0].text).results[0].url,
    ).toContain('v2.tauri.app');
    proc.kill();
    await once(proc, 'exit');
  });

  it('returns the structured application error for an oversized limit', async () => {
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
    expect(JSON.parse(response.result.content![0].text)).toEqual({
      error: {
        code: 'INVALID_LIMIT',
        message: 'limit must be an integer between 1 and 10',
      },
    });
    proc.kill();
    await once(proc, 'exit');
  });
});
