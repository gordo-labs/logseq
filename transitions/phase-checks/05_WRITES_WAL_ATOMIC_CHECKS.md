# Phase 05 — Transactional Writes (WAL + Atomic Renames) — Checks

**Objective:** Write-through transactions to files + sidecar; crash-safe.

## `PHASE.yml`
```yaml
phase: "05_WRITES_WAL"
allowed_paths:
  - packages/file-core/src/write.ts
  - packages/file-core/src/tx.ts
  - packages/file-core/src/wal.ts
  - packages/file-core/src/serialize.ts
  - packages/file-core/test/write.spec.ts
  - packages/file-core/test/recovery.spec.ts
acceptance:
  - pnpm -w build
  - pnpm -w test
  - pnpm -w lint
  - pnpm -w typecheck
ts_strict_required: true
```

## Manual spot-checks
- On simulated crash, recovery replays/rolls-back correctly.
- No partial writes; fingerprints and ops_log updated.

## Commands
```bash
node tools/check_phase.mjs
pnpm -w build && pnpm -w test
```
