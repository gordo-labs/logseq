# Logseq Desktop (Tauri)

A minimal desktop client for the file-first Logseq graph. The UI is built with React and talks to the filesystem through Tauri commands while relying exclusively on `@logseq/file-core` for reading graph data.

## Features

- **Today landing page** – automatically opens the current journal page and lets you create a new entry if it does not exist yet.
- **Pages explorer** – paginated list with quick search to jump between pages.
- **Virtualised page view** – renders large block trees efficiently with inline editing, creation, deletion and reordering.
- **Backlinks on demand** – open a lightweight side panel to inspect inbound references.
- **Graph maintenance** – pick a graph root, trigger reindex/verify/compact operations and inspect the `ops_log` history.
- **Transactional writes** – block edits are wrapped in optimistic transactions with automatic rollback on failure.

## Getting started

```bash
pnpm install
pnpm --filter @logseq/desktop dev   # start Vite + Tauri dev tools
```

During development the web UI runs on <http://localhost:1420>. The Tauri backend exposes commands for filesystem access, transaction handling and maintenance tasks.

To create a production build:

```bash
pnpm --filter @logseq/desktop build
```

This builds the React frontend; run `pnpm tauri build` from `apps/desktop` when you want a packaged desktop binary.

## Project structure

- `src/` – React application code (Graph provider, layout, components and utility helpers).
- `src-tauri/` – Rust commands powering filesystem access and graph maintenance.
- `styles.css` – application styling.

## Notes

- File watching is not implemented yet; reload the graph from the Settings panel after external changes.
- Transactions append a JSON entry to `.graph/ops_log.jsonl` so the history view has immediate feedback.
