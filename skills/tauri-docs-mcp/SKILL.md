---
name: tauri-docs-mcp
description: Use when an agent needs official Tauri 2 documentation through the tauri-docs-mcp read-only stdio server. Resolve a snapshot before querying and preserve returned citations.
---

# Tauri Documentation MCP

Use the configured `tauri-docs` MCP server for official Tauri 2 documentation. It reads a checked-in immutable corpus and never fetches arbitrary URLs, writes files, executes code, or debugs a runtime.

## Resolve, then query

Call `resolve_tauri_docs` first. Use `{}` for the default snapshot or select an immutable identifier:

```json
{}
```

```json
{ "identifier": "tauri@2" }
```

Pass the returned `snapshot` to `query_tauri_docs` when citing a specific snapshot:

```json
{
  "query": "capabilities permissions",
  "snapshot": "tauri-2@58194ceb69424c4332b2780b196ced3a6fffb32b",
  "limit": 3
}
```

`query` is 1–200 characters with at most 16 whitespace-separated terms. `limit` is 1–10. Results include the canonical Tauri URL, title, section, content, snapshot, source revision, and `versionSensitive`; retain those fields in answers. `search_tauri_docs` remains a compatibility tool, but new usage should prefer resolve → query.

## Safe boundary

Only use these read-only tools: `resolve_tauri_docs`, `query_tauri_docs`, and compatibility `search_tauri_docs`. Do not request writes, arbitrary URL retrieval, hosted HTTP, OAuth, telemetry, shell execution, or runtime debugging through this server. If a snapshot or query is unsupported, report the structured error instead of guessing.
