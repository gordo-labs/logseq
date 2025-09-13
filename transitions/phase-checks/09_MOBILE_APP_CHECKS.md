# Phase 09 — Mobile App (React Native) — Checks

**Objective:** Minimal mobile client; FS adapter + optional SQLite JSI.

## `PHASE.yml`
```yaml
phase: "09_MOBILE_APP"
allowed_paths:
  - apps/mobile/**
  - packages/fs-adapter/src/rn.ts
  - pnpm-workspace.yaml
acceptance:
  - pnpm -w build
  - pnpm -w lint
  - pnpm -w test
  - pnpm -w typecheck
ts_strict_required: true
```

## Manual spot-checks
- Emulator run: Today opens; quick capture works; search/backlinks OK.

## Commands
```bash
node tools/check_phase.mjs
pnpm --filter apps/mobile build
```
