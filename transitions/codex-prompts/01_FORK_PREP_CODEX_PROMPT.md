# Codex Prompt — 01_FORK_PREP

# 00 — Master Guardrails (prepend to every phase prompt)

**Project Context:** We are refactoring a fork of Logseq into a **file-first** monorepo. Files (Markdown/Org) are the **source of truth**. A **sidecar SQLite index** in `.graph/` accelerates search/backlinks and keeps history. New clients (Desktop/Mobile) use `@logseq/file-core` only.

**Golden Rules:**
- Edit only files listed in **FILES TO TOUCH** for the current phase.
- TypeScript strict; no thrown errors across package boundaries — use typed results.
- No cross-package private imports; use only documented public exports.
- If ambiguous, add `TODO:` comments. Do **not** expand scope.
- Output: file diffs/new contents + exact shell commands to run. Stop when **ACCEPTANCE** passes.


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


## Create/Update these guard files

**PHASE.yml**
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

**tools/check_phase.mjs**
```js
#!/usr/bin/env node
import fs from "node:fs";
import cp from "node:child_process";
import path from "node:path";
import yaml from "yaml";

const root = process.cwd();
const cfg = yaml.parse(fs.readFileSync(path.join(root, "PHASE.yml"), "utf8"));

// Determine base ref (PR) or previous commit (push)
const baseRef = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "HEAD~1";
const diff = cp.execSync(`git diff --name-only ${baseRef}...HEAD`, { encoding: "utf8" })
  .trim().split("\n").filter(Boolean);

// Glob match
const { default: micromatch } = await import("micromatch");
const notAllowed = diff.filter(f => !micromatch.isMatch(f, cfg.allowed_paths || []));
if (notAllowed.length) {
  console.error("❌ Files changed outside allowed_paths:\n" + notAllowed.map(s=>" - "+s).join("\n"));
  process.exit(2);
}

// TS strict flags
if (cfg.ts_strict_required) {
  const ts = JSON.parse(fs.readFileSync(path.join(root,"tsconfig.base.json"),"utf8"));
  const c = ts.compilerOptions || {};
  const must = { strict:true, noImplicitAny:true, strictNullChecks:true };
  const missing = Object.entries(must).filter(([k,v]) => c[k] !== v).map(([k])=>k);
  if (missing.length) {
    console.error("❌ TypeScript strict flags missing: " + missing.join(", "));
    process.exit(3);
  }
}

// READ-ONLY markers
for (const p of (cfg.require_readonly_markers || [])) {
  const s = fs.readFileSync(path.join(root,p),"utf8");
  if (!/READ-ONLY/i.test(s)) {
    console.error(`❌ Missing "READ-ONLY" marker in ${p}`);
    process.exit(4);
  }
}

console.log("✅ Phase guard checks passed.");
```

**.github/workflows/ci.yml**
```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          cache: 'pnpm'
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: pnpm add -w yaml micromatch
      - run: node tools/check_phase.mjs
      - run: pnpm -w build
      - run: pnpm -w lint
      - run: pnpm -w test
      - run: pnpm -w typecheck
```

**Output requirements**
- Print full contents of all created/modified files (no ellipses).
- Print exact shell commands to run.
- Stop when the **ACCEPTANCE** section in the phase prompt passes.
