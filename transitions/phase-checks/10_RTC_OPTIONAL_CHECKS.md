# Phase 10 — RTC via CRDT (Optional) — Checks

**Objective:** CRDT overlay with deterministic serialization back to files.

## `PHASE.yml`
```yaml
phase: "10_RTC_OPTIONAL"
allowed_paths:
  - packages/file-core/src/crdt.ts
  - packages/file-core/test/crdt.spec.ts
acceptance:
  - pnpm -w build
  - pnpm -w test
  - pnpm -w lint
  - pnpm -w typecheck
ts_strict_required: true
```

## Manual spot-checks
- Two writers merge without conflict; persisted Markdown matches deterministic serializer.

## Commands
```bash
node tools/check_phase.mjs
pnpm -w test
```
