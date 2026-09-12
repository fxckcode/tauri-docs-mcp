import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { searchDocs, validateSearchInput } from './search.js';

export function createServer(): McpServer {
  const server = new McpServer({ name: 'tauri-docs-mcp', version: '0.1.0' });
  server.registerTool(
    'search_tauri_docs',
    {
      title: 'Search Tauri documentation',
      description:
        'Search the checked-in official Tauri 2 documentation index. Results are read-only and never fetch remote URLs.',
      inputSchema: {
        query: z
          .string()
          .min(1)
          .max(200)
          .describe('Search terms, 1-200 characters.'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .describe('Maximum results, from 1 to 10; defaults to 5.'),
      },
    },
    async (input) => {
      const validation = validateSearchInput(input);
      if (!validation.ok)
        return {
          isError: true,
          content: [
            { type: 'text', text: JSON.stringify({ error: validation.error }) },
          ],
        };
      const results = searchDocs(validation.value);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ query: validation.value.query, results }),
          },
        ],
      };
    },
  );
  return server;
}
