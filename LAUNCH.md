# Launch Instructions

## ✅ App is Ready to Launch

The desktop app has been built and configured to automatically detect and load your local Logseq data.

## Quick Launch

### Option 1: Development Mode (Recommended for Testing)
```bash
cd /Users/sergiogordo/Sites/Logseek/logseq
pnpm --filter @logseq/desktop dev
```

This will:
- Start the Vite dev server on http://localhost:1420
- Launch Tauri window (if Tauri is properly configured)
- Auto-detect your Logseq graphs on startup
- Hot-reload on code changes

### Option 2: Build Production Bundle
```bash
cd /Users/sergiogordo/Sites/Logseek/logseq/apps/desktop
pnpm tauri build
```

This creates a production-ready app bundle in `src-tauri/target/release/`.

## Auto-Detection Features

The app will automatically:

1. **Detect Logseq Graphs on Startup**
   - Scans `~/logseq/graphs` for DB-based graphs
   - Scans `~/Documents` and `~/Desktop` for file-based graphs (directories with `.logseq` folder)
   - Auto-loads the first found graph

2. **Remember Last Graph**
   - Saves the last used graph path
   - Auto-loads it on next startup

3. **Show Found Graphs in Settings**
   - Settings panel displays all detected Logseq graphs
   - Click any graph to switch to it

## Graph Locations Checked

The app searches for Logseq graphs in:
- `~/logseq/graphs/*` - DB-based graphs (new Logseq format)
- `~/Documents/*/.logseq` - File-based graphs in Documents
- `~/Desktop/*/.logseq` - File-based graphs on Desktop

## Manual Graph Selection

If auto-detection doesn't find your graph:
1. Click "Settings" button
2. Click "Choose folder…"
3. Select your graph directory (should contain `.logseq` folder or markdown files)

## Performance Features

- **Instant UI**: App shows in <500ms
- **Lazy Loading**: Pages load on-demand when opened
- **Background Indexing**: Large graphs index without blocking UI
- **Smart Caching**: Page list loads instantly from cache

## Troubleshooting

### If no graphs are detected:
- Check that your graph directory contains either:
  - A `.logseq` folder (file-based graph), OR
  - Markdown files (`.md`) in the root directory
- Manually select the graph folder via Settings

### If app doesn't launch:
- Check that all dependencies are installed: `pnpm install`
- Verify Rust/Tauri is installed: `cargo --version`
- Check console for errors

### If pages don't load:
- Check browser console (F12) for errors
- Verify graph root path is correct
- Try reloading the graph from Settings

## Next Steps

1. **Launch the app**: `pnpm --filter @logseq/desktop dev`
2. **Verify auto-detection**: Check if your graph loads automatically
3. **Test performance**: Verify startup is fast (<3 seconds to ready)
4. **Test features**: Create/edit pages, verify transactions work
