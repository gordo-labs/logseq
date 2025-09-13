# Phase 12 — Docs, Versioning, Release — Checks

**Objective:** Finalize docs; version; ship clients.

## `PHASE.yml`
```yaml
phase: "12_DOCS_VERSION_RELEASE"
allowed_paths:
  - SPEC.md
  - packages/**/README.md
  - .changeset/**
  - tools/scripts/**
  - .github/workflows/**
acceptance:
  - pnpm -w build
  - pnpm -w lint
  - pnpm -w test
  - pnpm -w typecheck
ts_strict_required: true
```

## Manual spot-checks
- SPEC & READMEs reflect file-first + sidecar architecture.
- Changesets present; dry-run publish of core OK.
- Desktop/Mobile builds succeed.

## Commands
```bash
node tools/check_phase.mjs
pnpm changeset status
```
