# 08 — Phase 7: Desktop App (Tauri + React)

**GOAL:** Minimal desktop client using public file-core API; lazy-load UX.

**FILES TO TOUCH**
- `apps/desktop/**` (scaffold + components)
- `apps/desktop/README.md`

**INSTRUCTIONS**
1) Landing: Today journal page.
2) Views: Pages list (paginated), Page view with virtualized block tree, Backlinks (on demand), Search.
3) Settings: choose graph root; reindex/verify/compact; history from `ops_log`.
4) Writes: use `transaction` API; optimistic updates with rollback.

**ACCEPTANCE**
- Manual E2E: open Today; create/edit/move blocks; backlinks correct; search fast.
