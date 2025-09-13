# Phase 03 — `@logseq/file-core` Read-Only — Checks

**Objective:** Watcher + parser + in-memory indices + read API.

## `PHASE.yml`
```yaml
phase: "03_FILE_CORE_READONLY"
allowed_paths:
  - packages/model/**
  - packages/fs-adapter/**
  - packages/file-core/**
  - tools/fixtures/**
  - pnpm-workspace.yaml
  - tsconfig.base.json
acceptance:
  - pnpm -w build
  - pnpm -w test
  - pnpm -w lint
  - pnpm -w typecheck
ts_strict_required: true
```

## Manual spot-checks
- Sample `tools/fixtures/graph-root/` parsed; backlinks correct.
- `listChildren` preserves order; IDs stable.

## Commands
```bash
node tools/check_phase.mjs
pnpm -w build && pnpm -w test
```
