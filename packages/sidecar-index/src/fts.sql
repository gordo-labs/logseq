<<<<<<< ours
CREATE VIRTUAL TABLE IF NOT EXISTS page_fts USING FTS5(title, page_id UNINDEXED);
CREATE VIRTUAL TABLE IF NOT EXISTS block_fts USING FTS5(text, block_id UNINDEXED);
=======
-- FTS table for blocks
CREATE VIRTUAL TABLE IF NOT EXISTS fts_blocks USING fts5(body, content='blocks', content_rowid='rowid');
>>>>>>> theirs
