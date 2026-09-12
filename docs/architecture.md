# Architecture

`tauri-docs-mcp` is a small, local MCP server. Its seams are deliberately
explicit so retrieval changes do not change the protocol boundary.

```text
MCP stdio transport -> server contract handlers -> retrieval -> corpus
```

## MCP transport

`src/index.ts` owns process startup and connects the MCP SDK's
`StdioServerTransport`. The process speaks JSON-RPC over stdin/stdout only.
It must not expose an HTTP listener, accept arbitrary network requests, or
write protocol diagnostics to stdout.

## Server contracts

`src/server.ts` owns the MCP server identity, tool registration, input
contract, and output/error envelope. This layer translates MCP requests to
retrieval calls; it does not know how the corpus is stored or scored.

The public contract currently contains one read-only tool,
`search_tauri_docs`, with a bounded query and result limit. Preserve its
shape and error codes when changing internals.

## Corpus

`src/search.ts` contains the checked-in `DOC_INDEX`. Entries are official
Tauri 2 documentation URLs under `https://v2.tauri.app/` and include the
metadata returned to clients. The corpus is static at runtime: the server
never crawls, fetches user-controlled URLs, or mutates files.

## Retrieval

`searchDocs` validates the bounded input, scores terms against allowlisted
entry fields, applies deterministic ordering, and returns a bounded result
set. Retrieval is synchronous and in-memory. A future retrieval improvement
should remain behind this seam and preserve official-source constraints and
determinism.

## Distribution boundary

The npm package publishes only compiled runtime files under `dist`, plus the
README and license. Tests, source files, local configuration, credentials, and
development artifacts remain outside the package allowlist. The `bin`
metadata launches the compiled stdio server for MCP clients.
