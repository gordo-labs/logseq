# Phase 02 — Inventory Legacy File Logic — Checks

**Objective:** Document file-graph behaviors.

## `PHASE.yml`
```yaml
phase: "02_INVENTORY"
allowed_paths:
  - tools/inventory.md
acceptance:
  - pnpm -w build
  - pnpm -w lint
  - pnpm -w test
  - pnpm -w typecheck
ts_strict_required: true
```

## Manual spot-checks
- `tools/inventory.md` lists:
  - block UUIDs (`id::`), `key:: value`, link forms `[[Page]]` / `((uuid))`,
  - journals naming, page title ↔ file mapping, namespaces,
  - any legacy quirks and TODOs.

## Commands
```bash
node tools/check_phase.mjs
pnpm -w build && pnpm -w test && pnpm -w lint && pnpm -w typecheck
```
