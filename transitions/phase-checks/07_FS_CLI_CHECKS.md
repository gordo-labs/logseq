# Phase 07 — CLI (`fs-cli`) — Checks

**Objective:** Power-user CLI wired to file-core and sidecar.

## `PHASE.yml`
```yaml
phase: "07_FS_CLI"
allowed_paths:
  - packages/fs-cli/**
  - pnpm-workspace.yaml
acceptance:
  - pnpm -w build
  - pnpm -w test
  - pnpm -w lint
  - pnpm -w typecheck
  - node packages/fs-cli/bin/logseqfs --help
ts_strict_required: true
```

## Manual spot-checks
- `logseqfs reindex` affects only changed files.
- `logseqfs verify` reports dup titles / dangling refs.

## Commands
```bash
node tools/check_phase.mjs
node packages/fs-cli/bin/logseqfs --help
```
