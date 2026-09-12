import packageMetadata from '../package.json' with { type: 'json' };
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { searchDocs, validateSearchInput } from './search.js';
import {
  QUERY_INPUT_SCHEMA,
  RESOLVE_INPUT_SCHEMA,
  queryDocs,
  resolveSnapshot,
  validateQueryInput,
  validateResolveInput,
} from './resolver-query.js';

export function createServer(): Server {
  const server = new Server(
    { name: 'tauri-docs-mcp', version: packageMetadata.version },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'resolve_tauri_docs',
        title: 'Resolve Tauri documentation snapshot',
        description:
          'Resolve a Tauri documentation identifier to deterministic metadata from the checked-in corpus.',
        inputSchema: RESOLVE_INPUT_SCHEMA,
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          destructiveHint: false,
        },
      },
      {
        name: 'query_tauri_docs',
        title: 'Query Tauri documentation',
        description:
          'Query bounded content from a selected or default checked-in Tauri documentation snapshot.',
        inputSchema: QUERY_INPUT_SCHEMA,
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          destructiveHint: false,
        },
      },
      {
        name: 'search_tauri_docs',
        title: 'Search Tauri documentation (compatibility)',
        description:
          'Compatibility search path. Prefer resolve_tauri_docs followed by query_tauri_docs.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              description: 'Search terms, 1-200 characters.',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 10,
              description: 'Maximum results, from 1 to 10; defaults to 5.',
            },
          },
          required: ['query'],
          additionalProperties: false,
        },
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          destructiveHint: false,
        },
      },
    ],
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'resolve_tauri_docs') {
      const validation = validateResolveInput(request.params.arguments);
      if (!validation.ok) return applicationError(validation.error);
      const result = resolveSnapshot(validation.value);
      return result.ok
        ? toolResult(result.value)
        : applicationError(result.error);
    }
    if (request.params.name === 'query_tauri_docs') {
      const validation = validateQueryInput(request.params.arguments);
      if (!validation.ok) return applicationError(validation.error);
      const resolved = resolveSnapshot({
        identifier: validation.value.snapshot,
      });
      if (!resolved.ok) return applicationError(resolved.error);
      return toolResult(queryDocs(validation.value));
    }
    if (request.params.name !== 'search_tauri_docs') {
      throw new McpError(ErrorCode.InvalidParams, 'Unknown tool');
    }
    const validation = validateSearchInput(request.params.arguments);
    if (!validation.ok) return applicationError(validation.error);
    const results = searchDocs(validation.value);
    return toolResult({ query: validation.value.query, results });
  });
  return server;
}

function toolResult(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value) }] };
}

function applicationError(error: unknown) {
  return {
    isError: true,
    content: [{ type: 'text' as const, text: JSON.stringify({ error }) }],
  };
}
