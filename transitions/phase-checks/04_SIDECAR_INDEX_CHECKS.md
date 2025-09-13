# Phase 04 — Sidecar Index (SQLite + FTS) — Checks

**Objective:** `.graph/index.sqlite` cache + fingerprints + FTS.

## `PHASE.yml`
```yaml
phase: "04_SIDECAR_INDEX"
allowed_paths:
  - packages/sidecar-index/**
  - packages/file-core/src/indexer.ts
  - packages/file-core/test/indexer.spec.ts
  - tools/fixtures/**
  - pnpm-workspace.yaml
acceptance:
  - pnpm -w build
  - pnpm -w test
  - pnpm -w lint
  - pnpm -w typecheck
ts_strict_required: true
```

## Manual spot-checks
- First run builds sidecar; second run only touches changed files.
- `search()` uses FTS and returns expected hits.

## Commands
```bash
node tools/check_phase.mjs
pnpm -w build && pnpm -w test
```
