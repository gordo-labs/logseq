# 11 — Phase 10: Encryption & Stability

**GOAL:** Optional encryption for sidecar; maintenance tasks.

**FILES TO TOUCH**
- `packages/sidecar-index/src/crypto.ts`
- `packages/file-core/src/maintenance.ts`
- Docs in READMEs

**INSTRUCTIONS**
- If SQLCipher available: enable; else document file-level encryption tradeoffs.
- Implement `compact()` to vacuum FTS and rotate WAL.
- Keys via OS keychain/Keystore/Keychain.

**ACCEPTANCE**
- Compact works; encrypted sidecar opens/reads/writes; tests pass.
