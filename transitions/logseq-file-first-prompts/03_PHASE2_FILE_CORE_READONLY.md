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
