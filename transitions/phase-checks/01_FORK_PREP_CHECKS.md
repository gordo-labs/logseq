# Phase 01 — Fork Prep & Legacy Isolation — Checks

**Objective:** Monorepo scaffolding + isolate legacy Logseq UI.

## `PHASE.yml` for this phase
```yaml
phase: "01_FORK_PREP"
allowed_paths:
  - package.json
  - pnpm-workspace.yaml
  - tsconfig.base.json
  - .eslintrc.cjs
  - .prettierrc
  - .github/workflows/**
  - apps/legacy/**
  - apps/**/.gitkeep
  - packages/**/.gitkeep
  - tools/**
acceptance:
  - pnpm i
  - pnpm -w build
  - pnpm -w lint
  - pnpm -w test
  - pnpm -w typecheck
require_readonly_markers:
  - apps/legacy/README.md
ts_strict_required: true
```

## Manual spot-checks
- `apps/legacy/` exists with old UI and `README.md` contains **READ-ONLY**.
- Workspaces include `apps/*`, `packages/*`.
- TS strict flags enabled (strict, noImplicitAny, strictNullChecks).

## Commands
```bash
pnpm i
pnpm -w build
pnpm -w lint
pnpm -w test
pnpm -w typecheck
node tools/check_phase.mjs
```
