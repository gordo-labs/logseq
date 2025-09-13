# Phase-Gate Guard System

Use this to verify each phase is correct **in CI**.

## 1) `PHASE.yml` (put at repo root)

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

Update `phase` and `allowed_paths` per step (see each phase file).

## 2) Guard script `tools/check_phase.mjs`

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

## 3) CI workflow `.github/workflows/ci.yml`

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

## 4) Definition-of-Done (per phase)

- All **acceptance** commands in `PHASE.yml` succeed.
- `tools/check_phase.mjs` passes.
- Manual spot-checks listed in the phase file are OK.
- Optionally: tag the repo `phase-XX-done`.
