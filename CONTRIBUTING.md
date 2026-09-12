# Contributing

Thanks for contributing. Keep changes focused, reviewable, and within the
project boundary.

## Prerequisites

- Node.js 20.19 or newer (the current supported Node LTS line)
- npm 10 or newer

The committed `package-lock.json` is authoritative. Use `npm install` when
developing or changing dependencies, and include lockfile updates in the same
change. CI and release checks use `npm ci` from the committed lockfile.

## Setup and checks

```bash
npm install
npm run typecheck
npm run build
npm test
npm run lint
npm run format:check
npm pack --dry-run
```

The authoritative PR check also packs the project and installs that tarball
in a disposable directory before exercising MCP initialization, `tools/list`,
a valid search, and invalid input. Reproduce that check locally with:

```bash
mkdir -p .tmp/package
TARBALL=$(npm pack --json --pack-destination .tmp/package | node -e "let s=''; process.stdin.on('data', d => s += d).on('end', () => process.stdout.write(JSON.parse(s)[0].filename))")
npm run package:smoke -- ".tmp/package/$TARBALL"
rm -rf .tmp
```

Run the local stdio server with `node --import tsx src/index.ts`, or run the
built package with `node dist/src/index.js` after `npm run build`.

## Pull requests

Use a focused branch and a Conventional Commit message such as
`docs: clarify package boundary`. Explain the motivation, changed behavior,
and validation commands in the pull request. Do not include credentials,
local artifacts, generated `dist` output, or unrelated formatting changes.

The runtime contract is intentionally narrow: one read-only search tool,
stdio transport only, and a checked-in corpus sourced from official Tauri 2
documentation. Changes adding tools, writes, live crawling, hosted HTTP,
authentication, or telemetry require a separately approved design.

## Security

Never disclose a vulnerability in a public issue or pull request. Follow
[SECURITY.md](SECURITY.md) for private reporting.
