# 07 — Phase 6: CLI (`fs-cli`)

**GOAL:** Provide `logseqfs` for power users.

**FILES TO TOUCH**
- `packages/fs-cli/{package.json,tsconfig.json,src/index.ts,src/commands/*.ts}`
- `packages/fs-cli/bin/logseqfs`
- `packages/fs-cli/test/cli.spec.ts`

**COMMANDS**
- `init`, `reindex`, `verify`, `compact`, `convert-legacy`

**INSTRUCTIONS**
- Wire commands to file-core + sidecar-index APIs.
- `convert-legacy`:
  - From DB-graph: export or transform → files; ensure `id::` present; write fingerprints; run reindex.
  - From file-graph: normalize titles/ids; run reindex.

**ACCEPTANCE**
- Help prints; each command runs against a temp graph and passes tests.
