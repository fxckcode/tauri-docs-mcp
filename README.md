# tauri-docs-mcp

[![npm version](https://img.shields.io/npm/v/tauri-docs-mcp)](https://www.npmjs.com/package/tauri-docs-mcp)

A read-only Model Context Protocol (MCP) server for resolving and querying a
checked-in snapshot of official Tauri 2 documentation.

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

Portable configurations for generic MCP clients, Claude Desktop, Cursor, and
VS Code are in [`examples/mcp/`](examples/mcp/). They pin the package version
and use stdio only. Installable agent guidance is in
[`skills/tauri-docs-mcp/SKILL.md`](skills/tauri-docs-mcp/SKILL.md).

The server writes MCP JSON-RPC messages only to stdout. It does not start an
HTTP listener. Diagnostics are disabled by default; opt in with
`TAURI_DOCS_MCP_DIAGNOSTICS=1` and they are written to stderr as event names
only (never request arguments, corpus content, secrets, or PII).

## Tool contract

The server exposes two stable tools and one backwards-compatible legacy tool.

### `resolve_tauri_docs`

Resolve the default snapshot or an explicit identifier:

```json
{}
```

```json
{ "identifier": "tauri@2" }
```

Supported identifiers are `tauri`, `tauri@2`, and the immutable snapshot ID
`tauri-2@58194ceb69424c4332b2780b196ced3a6fffb32b`. Resolution is deterministic
and returns snapshot, source revision, generated-at, version, and entry-count
metadata. Unsupported identifiers return `UNSUPPORTED_SNAPSHOT`.

### `query_tauri_docs`

Query content from the default or selected snapshot:

```json
{ "query": "capabilities", "snapshot": "tauri@2", "limit": 3 }
```

`query` is required and must contain 1–200 non-whitespace characters and at
most 16 whitespace-separated terms. `snapshot` is optional and accepts the
resolver identifiers. `limit` is an optional integer from 1–10 (default 5).
Results are bounded, deterministic,
and include title, heading, section, canonical URL, content, corpus snapshot,
source revision, Tauri version, and `versionSensitive`. Empty matches return
`results: []`, not an application error. Inputs reject unknown fields.

Both tools are read-only and idempotent. They read only the checked-in corpus;
there is no live fetching or arbitrary URL access.

### Resource and lifecycle bounds

The shared tool contract enforces a 200-character query, 16 terms, 10 results,
1,200-character snippets, 8 KiB corpus entries, and 32 KiB serialized tool
responses. The stdio frame buffer is capped at 64 KiB. EOF, transport errors,
SIGINT, and SIGTERM share an idempotent shutdown path with a one-second cleanup
bound; in-flight work is allowed to settle or is abandoned at that bound.

### `search_tauri_docs` (compatibility)

Existing clients can continue to call:

```json
{ "query": "capabilities", "limit": 3 }
```

It remains supported with its existing response shape and limits. New clients
should use `resolve_tauri_docs` followed by `query_tauri_docs`.

Application errors are returned with stable discriminated codes such as
`INVALID_INPUT`, `INVALID_QUERY`, `INVALID_LIMIT`, and
`UNSUPPORTED_SNAPSHOT`; protocol errors remain MCP protocol errors.

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
npm run package:smoke -- /path/to/tauri-docs-mcp-0.1.0.tgz # test a packed install
```

The pull-request workflow runs the same commands from a clean checkout. To
reproduce its package step locally, create a tarball and pass its path to the
smoke test:

```bash
mkdir -p .tmp/package
TARBALL=$(npm pack --json --pack-destination .tmp/package | node -e "let s=''; process.stdin.on('data', d => s += d).on('end', () => process.stdout.write(JSON.parse(s)[0].filename))")
npm run package:smoke -- ".tmp/package/$TARBALL"
rm -rf .tmp
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution rules and
[SUPPORT.md](SUPPORT.md) for supported use cases. Report vulnerabilities
privately as described in [SECURITY.md](SECURITY.md).

## Releases and registry

The release workflow runs from a version tag and checks package, immutable
corpus metadata, registry metadata, and the pack allowlist before publishing.
npm publishing uses provenance/trusted publishing where enabled, then runs a
fresh published-package smoke gate. Official MCP Registry publication is a
separately protected environment chained after the successful npm job. No
release is published from pull requests. See [CHANGELOG.md](CHANGELOG.md) for
the release and MCP contract-change process.

## Corpus maintenance

The runtime reads only the checked-in generated snapshot under `corpus/`; it
never fetches documentation URLs. The approved manifest records canonical URLs,
section hierarchy, Tauri version, source revision/freshness metadata, and a
SHA-256 hash for each concise excerpt. The source revision is immutable, so a
future snapshot must use a new `tauri-2@<revision>` directory.

After an approved source review, regenerate and validate deterministically:

```bash
npm run ingest:docs
npm run validate:corpus
```

`validate:corpus` fails if the manifest is unsafe or incomplete, if content
hashes drift, or if the generated artifact differs from its manifest. Source
and license attribution is preserved in [corpus/NOTICES.md](corpus/NOTICES.md).

## Sources

- [MCP transport concepts](https://modelcontextprotocol.io/docs/concepts/transports)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Official Tauri 2 documentation](https://v2.tauri.app/)
