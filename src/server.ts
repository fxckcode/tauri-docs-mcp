import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { searchDocs, validateSearchInput } from './search.js';

export function createServer(): Server {
  const server = new Server(
    { name: 'tauri-docs-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'search_tauri_docs',
        title: 'Search Tauri documentation',
        description:
          'Search the checked-in official Tauri 2 documentation index. Results are read-only and never fetch remote URLs.',
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
      },
    ],
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== 'search_tauri_docs') {
      throw new McpError(ErrorCode.InvalidParams, 'Unknown tool');
    }
    const validation = validateSearchInput(request.params.arguments);
    if (!validation.ok) {
      return {
        isError: true,
        content: [
          { type: 'text', text: JSON.stringify({ error: validation.error }) },
        ],
      };
    }
    const results = searchDocs(validation.value);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ query: validation.value.query, results }),
        },
      ],
    };
  });
  return server;
}
