# Codex Prompt — 03_FILE_CORE_READONLY

# 00 — Master Guardrails (prepend to every phase prompt)

**Project Context:** We are refactoring a fork of Logseq into a **file-first** monorepo. Files (Markdown/Org) are the **source of truth**. A **sidecar SQLite index** in `.graph/` accelerates search/backlinks and keeps history. New clients (Desktop/Mobile) use `@logseq/file-core` only.

**Golden Rules:**
- Edit only files listed in **FILES TO TOUCH** for the current phase.
- TypeScript strict; no thrown errors across package boundaries — use typed results.
- No cross-package private imports; use only documented public exports.
- If ambiguous, add `TODO:` comments. Do **not** expand scope.
- Output: file diffs/new contents + exact shell commands to run. Stop when **ACCEPTANCE** passes.


# 03 — Phase 2: `@logseq/file-core` Read-Only

**GOAL:** Build watcher + parser + in-memory indices; expose read-only API.

**FILES TO TOUCH**
- `packages/model/{package.json,tsconfig.json,src/types.ts,src/zod.ts,src/index.ts}`
- `packages/fs-adapter/{package.json,tsconfig.json,src/node.ts,src/types.ts}`
- `packages/file-core/{package.json,tsconfig.json,src/index.ts,src/core.ts,src/watch.ts,src/parse.ts,src/read.ts,src/errors.ts}`
- `packages/file-core/test/read.spec.ts`

**INSTRUCTIONS**
1) Implement FS adapter (Node): list/read files, stat, watch.
2) Parser (Markdown): extract blocks, `id::`, `key:: value`, links; build per-file block tree.
3) Indices: `pageByTitle`, `blocksById`, `childrenByParent`, `backlinks` (derived).
4) Read API: `getPage`, `getPageByTitle`, `listPages`, `getBlock`, `listBlocksByPage`, `listChildren`, `listLinksToPage`, `listLinksToBlock`, `search` (basic text contains).

**ACCEPTANCE**
- Tests pass on a sample `graph-root/` fixture; backlinks correct; order preserved.


## Create/Update these guard files

**PHASE.yml**
```yaml
phase: "03_FILE_CORE_READONLY"
allowed_paths:
  - packages/model/**
  - packages/fs-adapter/**
  - packages/file-core/**
  - tools/fixtures/**
  - pnpm-workspace.yaml
  - tsconfig.base.json
acceptance:
  - pnpm -w build
  - pnpm -w test
  - pnpm -w lint
  - pnpm -w typecheck
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
