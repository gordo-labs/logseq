# 10 — Phase 9 (Optional): RTC via CRDT Overlay

**GOAL:** Optional real-time collaboration with files still canonical.

**FILES TO TOUCH**
- `packages/file-core/src/crdt.ts`
- `packages/file-core/test/crdt.spec.ts`

**INSTRUCTIONS**
- Yjs/Automerge document per page in `.graph/crdt`.
- Live sessions exchange CRDT deltas; on save/idle, deterministically serialize back to Markdown; then run transactional file write flow.

**ACCEPTANCE**
- Basic multi-writer test merges without conflict and persists to files.
