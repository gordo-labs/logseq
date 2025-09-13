# 01 — Phase 0: Fork Prep & Legacy Isolation

**GOAL:** Prepare the monorepo and isolate the legacy UI.

**FILES TO TOUCH**
- `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`
- `.eslintrc.cjs`, `.prettierrc`
- `.github/workflows/ci.yml`
- Create: `apps/legacy/`, `apps/desktop/`, `apps/mobile/`, `packages/`, `tools/`
- Move existing Logseq app to `apps/legacy/` (no modifications).

**INSTRUCTIONS**
1) Initialize pnpm workspace + Nx/Turborepo; strict TS.
2) Root scripts: `build`, `test`, `lint`, `typecheck`.
3) CI workflow to run scripts on PRs.
4) `apps/legacy/README.md` stating **READ-ONLY**.

**ACCEPTANCE**
- `pnpm i` OK; `pnpm -w build|test|lint|typecheck` OK.
- Legacy UI present and marked READ-ONLY.

**RUN**
```
pnpm i
pnpm -w build
pnpm -w lint
pnpm -w test
pnpm -w typecheck
```
