# Transitions Index

Folder layout:
```
/transitions
  /logseq-file-first-prompts   # build instructions per phase
  /phase-checks                # verification & CI guards per phase
  /codex-prompts               # ready-to-paste combined prompts for Codex
  SPEC.md                      # master spec
```

## How to use
1. Open `/codex-prompts/<PHASE>_CODEX_PROMPT.md`.
2. Paste its contents into Codex.
3. Run the commands it prints. If anything fails, paste errors back (same phase).
4. When green, update `PHASE.yml` to the next phase and repeat.

## Phase mapping
| Phase code | Codex prompt | Build prompt | Checks |
|---|---|---|---|
| 01_FORK_PREP | `codex-prompts/01_FORK_PREP_CODEX_PROMPT.md` | `logseq-file-first-prompts/01_PHASE0_FORK_PREP.md` | `phase-checks/01_FORK_PREP_CHECKS.md` |
| 02_INVENTORY | `codex-prompts/02_INVENTORY_CODEX_PROMPT.md` | `logseq-file-first-prompts/02_PHASE1_INVENTORY.md` | `phase-checks/02_INVENTORY_CHECKS.md` |
| 03_FILE_CORE_READONLY | `codex-prompts/03_FILE_CORE_READONLY_CODEX_PROMPT.md` | `logseq-file-first-prompts/03_PHASE2_FILE_CORE_READONLY.md` | `phase-checks/03_FILE_CORE_READONLY_CHECKS.md` |
| 04_SIDECAR_INDEX | `codex-prompts/04_SIDECAR_INDEX_CODEX_PROMPT.md` | `logseq-file-first-prompts/04_PHASE3_SIDECAR_INDEX.md` | `phase-checks/04_SIDECAR_INDEX_CHECKS.md` |
| 05_WRITES_WAL | `codex-prompts/05_WRITES_WAL_CODEX_PROMPT.md` | `logseq-file-first-prompts/05_PHASE4_WRITES_WAL_ATOMIC.md` | `phase-checks/05_WRITES_WAL_ATOMIC_CHECKS.md` |
| 06_EXTERNAL_EDITS | `codex-prompts/06_EXTERNAL_EDITS_CODEX_PROMPT.md` | `logseq-file-first-prompts/06_PHASE5_EXTERNAL_EDITS_CONFLICTS.md` | `phase-checks/06_EXTERNAL_EDITS_CONFLICTS_CHECKS.md` |
| 07_FS_CLI | `codex-prompts/07_FS_CLI_CODEX_PROMPT.md` | `logseq-file-first-prompts/07_PHASE6_CLI.md` | `phase-checks/07_FS_CLI_CHECKS.md` |
| 08_DESKTOP_APP | `codex-prompts/08_DESKTOP_APP_CODEX_PROMPT.md` | `logseq-file-first-prompts/08_PHASE7_DESKTOP_APP.md` | `phase-checks/08_DESKTOP_APP_CHECKS.md` |
| 09_MOBILE_APP | `codex-prompts/09_MOBILE_APP_CODEX_PROMPT.md` | `logseq-file-first-prompts/09_PHASE8_MOBILE_APP.md` | `phase-checks/09_MOBILE_APP_CHECKS.md` |
| 10_RTC_OPTIONAL | `codex-prompts/10_RTC_OPTIONAL_CODEX_PROMPT.md` | `logseq-file-first-prompts/10_PHASE9_RTC_OPTIONAL.md` | `phase-checks/10_RTC_OPTIONAL_CHECKS.md` |
| 11_ENCRYPTION_STABILITY | `codex-prompts/11_ENCRYPTION_STABILITY_CODEX_PROMPT.md` | `logseq-file-first-prompts/11_PHASE10_ENCRYPTION_STABILITY.md` | `phase-checks/11_ENCRYPTION_STABILITY_CHECKS.md` |
| 12_DOCS_VERSION_RELEASE | `codex-prompts/12_DOCS_VERSION_RELEASE_CODEX_PROMPT.md` | `logseq-file-first-prompts/12_PHASE11_DOCS_VERSION_RELEASE.md` | `phase-checks/12_DOCS_VERSION_RELEASE_CHECKS.md` |
