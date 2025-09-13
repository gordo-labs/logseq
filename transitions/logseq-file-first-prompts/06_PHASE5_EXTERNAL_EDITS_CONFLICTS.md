# 06 — Phase 5: External Edits & Conflict Handling

**GOAL:** Detect external changes (other editors/git) and reindex safely.

**FILES TO TOUCH**
- `packages/file-core/src/watch.ts`, `src/conflicts.ts`
- `packages/file-core/test/conflicts.spec.ts`

**INSTRUCTIONS**
1) On FS event, recompute fingerprint; if changed, re-parse that file and update sidecar.
2) If in-app txn preconditions fail, abort and surface a conflict object (block-level by UUID if possible).
3) Provide a simple merge strategy stub; leave UI resolution to clients.

**ACCEPTANCE**
- Tests simulate external edits; conflicts are detected and no data loss occurs.
