#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createShutdown } from './lifecycle.js';
import { RESOURCE_LIMITS } from './resource-limits.js';
import { createServer } from './server.js';

const server = createServer();
const transport = new StdioServerTransport(undefined, undefined, {
  maxBufferSize: RESOURCE_LIMITS.maxStdioFrameBytes,
});
const diagnostics = process.env.TAURI_DOCS_MCP_DIAGNOSTICS === '1';
const log = (event: string) => {
  if (diagnostics) process.stderr.write(`[tauri-docs-mcp] ${event}\n`);
};
const shutdown = createShutdown({
  closeServer: () => server.close(),
  closeTransport: () => transport.close(),
});

let exiting = false;
const exit = async (reason: string, code = 0) => {
  if (exiting) return;
  exiting = true;
  log(`shutdown: ${reason}`);
  await shutdown();
  process.exit(code);
};

transport.onerror = (error) => {
  log(`transport error: ${error.name}`);
  void exit('transport error', 1);
};
transport.onclose = () => {
  void exit('connection closed');
};
process.stdin.once('end', () => void exit('stdin EOF'));
process.once('SIGINT', () => void exit('SIGINT'));
process.once('SIGTERM', () => void exit('SIGTERM'));

try {
  await server.connect(transport);
  log('started');
} catch (error) {
  log(`startup error: ${error instanceof Error ? error.name : 'Error'}`);
  await exit('startup failure', 1);
}
