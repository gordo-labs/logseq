# Phase 06 — External Edits & Conflicts — Checks

**Objective:** Detect external file changes; safe reindex; conflict surfacing.

## `PHASE.yml`
```yaml
phase: "06_EXTERNAL_EDITS"
allowed_paths:
  - packages/file-core/src/watch.ts
  - packages/file-core/src/conflicts.ts
  - packages/file-core/test/conflicts.spec.ts
acceptance:
  - pnpm -w build
  - pnpm -w test
  - pnpm -w lint
  - pnpm -w typecheck
ts_strict_required: true
```

## Manual spot-checks
- Changing a file outside the app triggers re-parse and sidecar update.
- In-app tx with stale fingerprint aborts with conflict object.

## Commands
```bash
node tools/check_phase.mjs
pnpm -w build && pnpm -w test
```
