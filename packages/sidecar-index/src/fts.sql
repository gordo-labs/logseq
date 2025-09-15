-- FTS table for blocks
CREATE VIRTUAL TABLE IF NOT EXISTS fts_blocks USING fts5(body, content='blocks', content_rowid='rowid');
