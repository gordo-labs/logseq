# 04 — Phase 3: Sidecar Index (SQLite + FTS)

**GOAL:** Add `.graph/index.sqlite` as a disposable cache for search/backlinks/history.

**FILES TO TOUCH**
- `packages/sidecar-index/{package.json,tsconfig.json,src/index.ts,src/schema.sql,src/fts.sql,src/write.ts,src/read.ts}`
- `packages/file-core/src/indexer.ts`
- `packages/file-core/test/indexer.spec.ts`

**INSTRUCTIONS**
1) Implement sidecar schema (files/pages/blocks/links, FTS, ops_log, kv_meta).
2) `fingerprints.json` (path → {mtime,size,hash}); incremental updates only for changed files.
3) On parse result, write/update rows and FTS; maintain backlinks in `links` table.
4) Expose index queries used by file-core’s `search` and backlinks.

**ACCEPTANCE**
- Changed-file-only reindex works; FTS queries return expected results.
