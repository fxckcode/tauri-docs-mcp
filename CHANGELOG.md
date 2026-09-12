# Changelog

All notable changes to this project are documented here. Versions follow
Semantic Versioning.

## [Unreleased]

- Reserve this section for unreleased contract or corpus changes.

## [0.2.0] - 2026-09-12

- Added portable MCP configuration examples and agent guidance.
- Added release metadata and official MCP Registry metadata.
- Added reproducible package and registry validation.

## Release rules

1. Bump `package.json` and `package-lock.json` together with the authoritative
   server version in `server.json` and the registry package version.
2. For MCP contract changes, document tool names, schemas, compatibility, and
   safe-boundary changes in this file and the README before tagging.
3. For corpus changes, pin a new source revision, create a new immutable
   `tauri-2@<revision>` directory, preserve attribution, and record the
   snapshot in `corpus/manifest.json`; never overwrite an existing snapshot.
4. Run `npm ci`, all checks, `npm pack --dry-run`, and the package smoke test
   from a clean checkout. Publishing is performed only by the protected release
   workflow with npm provenance/trusted publishing.
5. Registry publication is a separate, gated step and may run only after the
   exact npm package version has published successfully.
