CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  title TEXT,
  path TEXT
);
CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  page_id TEXT,
  parent_id TEXT,
  text TEXT
);
CREATE TABLE IF NOT EXISTS links (
  source_block_id TEXT,
  target_type TEXT,
  target TEXT
);
