# tauri-docs-mcp

A read-only Model Context Protocol (MCP) server for searching a checked-in index of official Tauri 2 documentation.

## Install

```bash
npm install
```

## Development

```bash
npm run typecheck
npm run build
npm test
npm run format:check
```

Run the server directly over stdio during development:

```bash
node --import tsx src/index.ts
```

The server writes only MCP JSON-RPC messages to stdout; diagnostics, if added later, belong on stderr.

## MCP client configuration

Build first, then configure an MCP client to launch the server with stdio:

```json
{
  "mcpServers": {
    "tauri-docs": {
      "command": "node",
      "args": ["/absolute/path/to/tauri-docs-mcp/dist/src/index.js"]
    }
  }
}
```

The only tool is `search_tauri_docs`:

```json
{ "query": "capabilities", "limit": 3 }
```

`query` is required and must contain 1–200 non-whitespace characters. `limit` is optional and must be an integer from 1–10 (default 5). Results are deterministic, bounded, include title, canonical URL, section, concise context, Tauri version, and a `versionSensitive` indicator. Invalid inputs return structured error objects.

## Scope and sources

This first slice uses a checked-in seed corpus and never fetches user-controlled URLs, writes files, executes arbitrary code, or controls a Tauri runtime. Seed URLs are under `https://v2.tauri.app/` and cover Tauri 2 documentation.

Protocol and SDK behavior follows the official MCP documentation and TypeScript SDK:

- https://modelcontextprotocol.io/docs/concepts/transports
- https://github.com/modelcontextprotocol/typescript-sdk
- https://v2.tauri.app/
