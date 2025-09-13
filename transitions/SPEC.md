# SPEC: logseq-file-first-suite

**Purpose:** Build a **file-first** Logseq-compatible system where Markdown/Org files are the **source of truth**, complemented by a **sidecar SQLite index** for speed, history, and search. Ship two clients (Desktop + Mobile) that consume a clean public API. The sidecar is disposable and rebuildable; edits are written to files and reflected to the sidecar **transactionally**.

---

## 0A) Starting from a Logseq fork — Extraction Plan (authoritative)

**Goal:** Carve out a clean **file-first core** from the Logseq fork, keeping legacy UI in `apps/legacy` as READ-ONLY reference. New clients (Desktop/Mobile) must depend **only** on the public file-core API.

**Scope boundaries (DO NOT EDIT)**
- Move existing Logseq UI to `apps/legacy/` (no further changes).
- No direct DB coupling in new clients; use file-core API only.

**Steps**
1. **Repo prep**
   - Add this `SPEC.md`, pnpm workspace, TS strict config, CI.
   - Move current Logseq UI to `apps/legacy/`.
2. **Inventory legacy logic**
   - Identify file graph conventions, block UUID handling, link parsing, journaling/order logic.
   - Document paths in `tools/inventory.md`.
3. **Define file-first architecture (see §4–§7)**
   - Files canonical; sidecar index as cache in `.graph/index.sqlite`.
   - WAL + atomic renames for transactional file writes.
4. **One-time extractor (optional)**
   - If starting from Logseq DB-graph, export to Markdown/Org and/or use a helper to dump DB → files.
5. **Stand up `@logseq/file-core` read-only**
   - Watcher → parser → in-memory indices; read API only.
6. **Parity tests (must pass before writes)**
   - Counts and backlinks equal vs legacy sample; parent/child order preserved.
7. **Add write API + transactional persistence + sidecar updates**
   - Implement WAL + atomic file renames; reflect changes to sidecar index within a single app-level transaction.
8. **Freeze public API**
   - Export only documented APIs; commit `schema.hash` for sidecar index.

**Acceptance**
- `apps/legacy` remains untouched after extraction.
- `pnpm -w test` runs parser + builds sidecar + parity suite passes.
- New clients use `@logseq/file-core` only.

---

## 0B) Project overview

- **Canonical:** Markdown/Org files under `<graph-root>/pages`, `<graph-root>/journals`.
- **Sidecar (cache):** `.graph/index.sqlite` for FTS/backlinks/fingerprints/history.
- **Clients:** `apps/desktop` (Tauri + React) and `apps/mobile` (React Native).
- **CLI:** `logseqfs` for init/reindex/verify/compact/convert-legacy.

---

## 1) Objectives

- **Primary:** Local-first file core with transactional writes and fast sidecar index.
- **Secondary:** Ship Desktop/Mobile clients with lazy-load UX (open Today first, fetch on demand).
- **Tertiary:** Provide CLI for power users; sidecar is reproducible and disposable.

## 2) Non-goals

- Full legacy UI parity day-1.
- Online sync/RTC (optional later via CRDT overlay).
- Making sidecar the source of truth (it is **not**).

---

## 3) Tech & constraints

- **Language:** TypeScript (strict).
- **Tooling:** pnpm + Nx (or Turborepo), ESLint, Prettier, Changesets.
- **Desktop:** Tauri (preferred) or Electron.
- **Mobile:** React Native; FS adapter + optional SQLite JSI for sidecar.
- **Parser:** unified/remark (Markdown) with custom plugins for `id::`, `key:: value`, `[[Page]]`, `((uuid))`.
- **Sidecar:** SQLite FTS5 (WAL mode); safe to delete; rebuild from files.
- **Security:** Local-first; optional encryption for sidecar (files remain plaintext by design).

---

## 4) Graph layout (canonical files)

```
<graph-root>/
  journals/                # daily notes (YYYY-MM-DD.md or 2025_09_13.md)
  pages/                   # one file per page
  assets/                  # attachments
  logseq/                  # legacy app config (optional)
  .graph/                  # sidecar (cache, safe to delete)
    index.sqlite
    fingerprints.json
    wal.log                # app-level WAL (JSONL)
    manifest.json          # last committed txn id, version
    crdt/                  # optional: RTC overlay (future)
```

**Page ⇄ file:** “My Topic” ⇄ `pages/My Topic.md` (or `.org`).  
**Blocks:** paragraphs/list items/headings; each block should have stable `id:: <uuid>` property.  
**Links:** `[[Page Title]]` and `((block-uuid))`.  
**Properties:** `key:: value` at block/page scope.  
**Ordering:** indentation + textual order.

---

## 5) Data model (domain types)

Same as before (Pages, Blocks, Links, Backlinks); files are canonical.

```ts
type UUID = string;
interface Page { id: UUID; title: string; createdAt: number; updatedAt: number; properties: Record<string, any>; }
interface Block { id: UUID; pageId: UUID; parentId: UUID | null; order: number; text: string; properties: Record<string, any>; createdAt: number; updatedAt: number; }
interface Link { fromBlockId: UUID; toPageTitle?: string; toBlockId?: UUID; }
interface Backlink { targetPageId?: UUID; targetBlockId?: UUID; sourceBlockId: UUID; }
```

---

## 6) Sidecar SQLite schema (cache)

```sql
-- files inventory & fingerprints
CREATE TABLE IF NOT EXISTS files(path TEXT PRIMARY KEY, mtime INTEGER, size INTEGER, hash TEXT);

-- graph model (denormalized for speed)
CREATE TABLE IF NOT EXISTS pages(id TEXT PRIMARY KEY, title TEXT UNIQUE, properties TEXT, created_at INT, updated_at INT);
CREATE TABLE IF NOT EXISTS blocks(id TEXT PRIMARY KEY, page_id TEXT, parent_id TEXT, "order" INT, text TEXT, properties TEXT, created_at INT, updated_at INT);
CREATE TABLE IF NOT EXISTS links(from_block_id TEXT, to_page_title TEXT, to_block_id TEXT);

-- full text search
CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts  USING fts5(title, content='pages', content_rowid='rowid');
CREATE VIRTUAL TABLE IF NOT EXISTS blocks_fts USING fts5(text,  content='blocks', content_rowid='rowid');

-- history (append-only)
CREATE TABLE IF NOT EXISTS ops_log(seq INTEGER PRIMARY KEY AUTOINCREMENT, ts INT, actor TEXT, kind TEXT, entity TEXT, id TEXT, data TEXT);

-- kv metadata
CREATE TABLE IF NOT EXISTS kv_meta(key TEXT PRIMARY KEY, val TEXT);
```

**Triggers** keep FTS in sync on pages/blocks insert/update/delete.

---

## 7) File-core public API (v0)

**Lifecycle**
```ts
openGraph(opts: { rootPath: string }): Promise<GraphHandle>;
closeGraph(g: GraphHandle): Promise<void>;
reindex(g: GraphHandle, paths?: string[]): Promise<void>; // incremental from fingerprints
verify(g: GraphHandle): Promise<VerifyReport>;
compact(g: GraphHandle): Promise<void>; // vacuum/rotate WAL
```

**Read**
```ts
getPage(g, id: UUID): Promise<Page|null>;
getPageByTitle(g, title: string): Promise<Page|null>;
listPages(g, q?: { search?: string; limit?: number; offset?: number }): Promise<Page[]>;

getBlock(g, id: UUID): Promise<Block|null>;
listBlocksByPage(g, pageId: UUID): Promise<Block[]>;
listChildren(g, parentId: UUID): Promise<Block[]>;

listLinksToPage(g, title: string): Promise<Backlink[]>;
listLinksToBlock(g, id: UUID): Promise<Backlink[]>;
search(g, query: string, opts?: { limit?: number }): Promise<(Page|Block)[]>;
```

**Write (transactional, write-through to files)**
```ts
transaction<T>(g: GraphHandle, fn: (tx: FileTx) => Promise<T>): Promise<T>;

createPage(tx, { title, properties? }): Promise<Page>;
updatePage(tx, id: UUID, patch: Partial<Page>): Promise<Page>;
deletePage(tx, id: UUID): Promise<void>;

createBlock(tx, { pageId, parentId?, order?, text, properties? }): Promise<Block>;
updateBlock(tx, id: UUID, patch: Partial<Block>): Promise<Block>;
moveBlock(tx, id: UUID, parentId: UUID|null, newOrder: number): Promise<void>;
deleteBlock(tx, id: UUID): Promise<void>;
```

**Events**
```ts
onChange(g, handler: (ops: ChangeSet) => void): Unsubscribe;
```

**Semantics**
- **Write-through:** file edits + sidecar updates happen in one app-level txn.
- **Atomicity:** temp file → fsync → atomic rename; then DB txn; commit WAL; update fingerprints & ops_log.
- **External edits:** on FS event + fingerprint mismatch, parse the changed file and update sidecar; abort conflicting in-app tx with a merge prompt.

---

## 8) CLI (`logseqfs`)

```
logseqfs init     --root <graph-folder>
logseqfs reindex  --root <graph-folder> [--changed-only]
logseqfs verify   --root <graph-folder>
logseqfs compact  --root <graph-folder>
logseqfs convert-legacy --source {db-graph|file-graph} --sqlite <old.db> --path <old-folder> --target <graph-folder>
```

- `convert-legacy` either exports DB-graph to files or normalizes a file-graph (adds missing `id::`, etc.).

---

## 9) Desktop & Mobile apps (lazy-load UX)

**Desktop (`apps/desktop`)**
- Landing: **Today** journal.
- Lazy load: open page on demand; virtualize long block trees; fetch backlinks on demand.
- Settings: select graph root, reindex/verify/compact, toggle sidecar location, history view from `ops_log`.

**Mobile (`apps/mobile`)**
- Same API via FS adapter & optional SQLite JSI for sidecar.
- Quick capture; debounced writes; background indexing while idle.

Both apps **never** access files/SQLite directly; they call `@logseq/file-core` only.

---

## 10) Transactions & Recovery

- App-level **WAL** in `.graph/wal.log` (JSONL).  
- `manifest.json` tracks `lastTxId` & sidecar version.  
- On startup: process pending WAL, verify preconditions (file hashes), repair/rollback.  
- Single-writer lock file `.graph/lock` to serialize writers.

---

## 11) History & Versioning

- Append each committed change to `ops_log`.  
- Optional: auto Git commit per transaction (hidden repo or user repo).  
- Expose per-block history (rendered from `ops_log`).

---

## 12) Migration

- **From file-graph (Markdown/Org):** point to folder; run `reindex`; no conversion needed.
- **From DB-graph (SQLite):** export pages/journals to Markdown; run `convert-legacy` if needed; then `reindex` and `verify`.

---

## 13) Quality gates

- Unit tests: parser, link extraction, ordering, write path, recovery, reindex.
- Property tests: random tree moves preserve preorder and IDs.
- Fuzz: import/export round-trip (file ↔ sidecar).
- E2E: Desktop (Playwright), Mobile (Detox).
- Performance (target 100k blocks):
  - Cold start (no cache): first index acceptable; subsequent starts ≤ 1.5s desktop / ≤ 2.5s mobile (changed-only parse).
  - Search p95 ≤ 120ms (warm).

---

## 14) Security & privacy

- Files are plaintext by design (portable).  
- Sidecar encryption optional (SQLCipher or file-level).  
- Keys stored in OS keychain / Keystore / Keychain.  
- No telemetry by default (opt-in later).

---

## 15) Developer experience

- `pnpm i`; `pnpm -w build|test|lint|typecheck`.  
- Changesets for SemVer across packages.  
- CI: build, test, lint; PR gates.

---

## 16) Monorepo layout

```
logseq-file-first-suite/
  apps/
    legacy/                 # Original Logseq UI (READ-ONLY reference)
    desktop/                # Tauri/Electron + React
    mobile/                 # React Native
  packages/
    model/                  # Shared domain types
    file-core/              # Watch/parse/index; write-through transactions
    sidecar-index/          # SQLite index builder + queries + FTS
    fs-adapter/             # Node/RN FS bindings
    fs-cli/                 # logseqfs CLI
    common-utils/           # Logging, errors, feature flags
    ui-kit/                 # (Optional) shared UI
  tools/
    extract-legacy.ts
    inventory.md
    scripts/
  .github/workflows/ci.yml
  SPEC.md
```

---

## 17) Acceptance criteria (project-level)

- Legacy UI isolated; no private access from new clients.  
- `@logseq/file-core` is the only programmatic entry point for clients.  
- Sidecar can be deleted and fully rebuilt from files.  
- Recovery and conflict handling verified.  
- Lazy-load UX implemented; performance budgets met.
