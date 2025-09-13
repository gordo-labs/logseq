# 05 — Phase 4: Transactional Writes (WAL + Atomic Renames)

**GOAL:** Implement write-through transactions: files + sidecar in one commit.

**FILES TO TOUCH**
- `packages/file-core/src/write.ts`, `src/tx.ts`, `src/wal.ts`, `src/serialize.ts`
- `packages/file-core/test/write.spec.ts`, `test/recovery.spec.ts`

**INSTRUCTIONS**
1) App-level WAL in `.graph/wal.log` (JSONL); `manifest.json` with `lastTxId`.
2) Write algorithm per txn:
   - Append WAL entry; fsync.
   - For each affected file: write `*.tmp` → fsync → atomic rename.
   - Sidecar updates in a single SQLite txn.
   - Update `fingerprints.json`, `ops_log`, `manifest.json`; rotate WAL.
3) Recovery on startup: process pending WAL (re-apply/rollback) based on pre-hashes.
4) Precondition check: abort if file fingerprint changed since read.

**ACCEPTANCE**
- Tests cover crash recovery, ordering, and no partial writes.
