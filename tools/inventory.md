# Legacy File Logic Inventory

## Block UUIDs (`id::`)
- deps/graph-parser/src/logseq/graph_parser/property.cljs — property delimiter `::` and validation helpers. TODO: confirm how `id::` is assigned.
- deps/common/src/logseq/common/util/block_ref.cljs — regex utilities for `((uuid))` block references.

## `key:: value` properties
- deps/graph-parser/src/logseq/graph_parser/property.cljs — builds property strings, validates names.
- src/main/frontend/handler/file_based/property/util.cljs — handles hidden properties and property cleanup.
- src/main/frontend/fs/watcher_handler.cljs — uses property handler to set block properties. TODO: review batch property updates.

## Links `[[Page]]`
- deps/common/src/logseq/common/util/page_ref.cljs — core page reference helpers.
- src/main/frontend/commands.cljs — command palette insertions for page refs.
- src/main/frontend/template.cljs — templates converting placeholders to page refs.

## Block links `((uuid))`
- deps/common/src/logseq/common/util/block_ref.cljs — defines block-ref syntax and id extraction.
- src/main/frontend/commands.cljs — shortcut to insert block references.
- src/main/frontend/handler/paste.cljs — detects block refs on paste.

## Journals
- src/main/frontend/date.cljs — journal title formatters and helpers.
- src/main/frontend/handler.cljs — creates today's journal lazily when user writes. TODO: find file creation logic.

## Page/File mapping
- src/main/frontend/handler/file_based/repo.cljs — `*page-name->path` atom tracks page to file mapping.
- src/main/frontend/worker/handler/page/file_based/page.cljs — builds file-based pages with properties block.

## Namespace titles
- deps/common/src/logseq/common/util/namespace.cljs — utilities to detect namespace pages via `/`.
- src/main/frontend/worker/handler/page/db_based/page.cljs — splits namespace pages when creating pages.
- deps/graph-parser/src/logseq/graph_parser/exporter.cljs — exports namespace pages and replaces with parent. TODO: confirm behavior for file graphs.

## Legacy quirks
- src/main/frontend/handler.cljs — journal file not created until user writes. TODO: survey other quirks.
