# Phase 08 — Desktop App (Tauri + React) — Checks

**Objective:** Minimal desktop client; lazy-load UX.

## `PHASE.yml`
```yaml
phase: "08_DESKTOP_APP"
allowed_paths:
  - apps/desktop/**
  - pnpm-workspace.yaml
acceptance:
  - pnpm -w build
  - pnpm -w lint
  - pnpm -w test
  - pnpm -w typecheck
ts_strict_required: true
```

## Manual spot-checks
- Landing shows Today journal.
- Creating/editing/moving blocks reflects in files and sidecar.
- Backlinks and search respond quickly.

## Commands
```bash
node tools/check_phase.mjs
pnpm --filter apps/desktop build
```
