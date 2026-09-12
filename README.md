# tauri-docs-mcp

[![npm version](https://img.shields.io/npm/v/tauri-docs-mcp)](https://www.npmjs.com/package/tauri-docs-mcp)

A read-only Model Context Protocol (MCP) server for searching a checked-in
index of official Tauri 2 documentation.

## Requirements

- Node.js 20.19 or newer (supported Node LTS)
- npm 10 or newer

The committed `package-lock.json` is authoritative. Use `npm install` for
local development and dependency changes; CI and reproducible installs use
`npm ci`. Lockfile changes must be committed with dependency changes.

## Install and run

Install the published package:

```bash
npm install --global tauri-docs-mcp
```

Or install it in a project and invoke the binary from `node_modules/.bin`:

```bash
npm install tauri-docs-mcp
npx tauri-docs-mcp
```

Build from a checkout, then run the compiled stdio server:

```bash
npm install
npm run build
node dist/src/index.js
```

Configure an MCP client to launch the installed binary over stdio:

```json
{
  "mcpServers": {
    "tauri-docs": {
      "command": "tauri-docs-mcp"
    }
  }
}
```

The server writes MCP JSON-RPC messages only to stdout. It does not start an
HTTP listener; diagnostics, if added later, belong on stderr.

## Tool contract

The only tool is `search_tauri_docs`:

```json
{ "query": "capabilities", "limit": 3 }
```

`query` is required and must contain 1–200 non-whitespace characters.
`limit` is optional and must be an integer from 1–10 (default 5). Results are
deterministic, bounded, and include title, canonical URL, section, concise
context, Tauri version, and a `versionSensitive` indicator. Invalid inputs
return structured error objects.

## Product boundary

This package is intentionally:

- read-only;
- stdio-only;
- limited to its checked-in corpus; and
- constrained to official Tauri 2 sources under `https://v2.tauri.app/`.

It never fetches user-controlled URLs, writes files, executes arbitrary code,
controls a Tauri runtime, provides hosted HTTP, authenticates users, or emits
telemetry. See [docs/architecture.md](docs/architecture.md) for the module
seams.

## Development commands

```bash
npm install          # install from package-lock.json
npm run typecheck    # TypeScript validation
npm run build        # compile runtime files to dist/
npm test             # run the full Vitest suite
npm run lint         # ESLint
npm run format       # format tracked source and documentation
npm run format:check # verify formatting without writing
npm pack --dry-run   # inspect the publish allowlist
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution rules and
[SUPPORT.md](SUPPORT.md) for supported use cases. Report vulnerabilities
privately as described in [SECURITY.md](SECURITY.md).

## Sources

- [MCP transport concepts](https://modelcontextprotocol.io/docs/concepts/transports)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Official Tauri 2 documentation](https://v2.tauri.app/)
