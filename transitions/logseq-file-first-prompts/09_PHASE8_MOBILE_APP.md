# 09 — Phase 8: Mobile App (React Native)

**GOAL:** Minimal mobile client; FS adapter + optional SQLite JSI for sidecar.

**FILES TO TOUCH**
- `apps/mobile/**`
- `packages/fs-adapter/src/rn.ts`

**INSTRUCTIONS**
1) Implement RN FS adapter; background-safe operations.
2) Views: Pages list → Page → Blocks; inline edit; search; quick capture.
3) Debounced writes; background indexing while idle.

**ACCEPTANCE**
- Emulator E2E: open Today; add/edit blocks; backlinks reflect; search works.
