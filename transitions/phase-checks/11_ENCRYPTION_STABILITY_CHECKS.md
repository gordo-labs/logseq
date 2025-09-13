# Phase 11 — Encryption & Stability — Checks

**Objective:** Optional encryption for sidecar; maintenance ops.

## `PHASE.yml`
```yaml
phase: "11_ENCRYPTION_STABILITY"
allowed_paths:
  - packages/sidecar-index/src/crypto.ts
  - packages/file-core/src/maintenance.ts
  - packages/**/README.md
acceptance:
  - pnpm -w build
  - pnpm -w test
  - pnpm -w lint
  - pnpm -w typecheck
ts_strict_required: true
```

## Manual spot-checks
- Encrypted sidecar opens/reads/writes.
- `compact()` vacuums FTS and rotates WAL.

## Commands
```bash
node tools/check_phase.mjs
pnpm -w test
```
