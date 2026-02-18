import type { Database } from 'sql.js';
import type { Page, Block, Backlink, SearchResult } from '@logseq/model';

export function search(db: Database, q: string): SearchResult {
  const like = `%${q}%`;
  const pages: Page[] = [];
  const blocks: Block[] = [];

  const pStmt = db.prepare('SELECT id, title, path FROM pages WHERE title LIKE ?');
  pStmt.bind([like]);
  while (pStmt.step()) {
    const [id, title, path] = pStmt.get() as [string, string, string];
    pages.push({ id, title, path });
  }
  pStmt.free();

  const bStmt = db.prepare('SELECT id, page_id, parent_id, text FROM blocks WHERE text LIKE ?');
  bStmt.bind([like]);
  while (bStmt.step()) {
    const [id, pageId, parentId, text] = bStmt.get() as [string, string, string | null, string];
    blocks.push({ id, pageId, parentId, text, links: [] });
  }
  bStmt.free();

  return { pages, blocks };
}

export function linksToPage(db: Database, title: string): Backlink[] {
  const res: Backlink[] = [];
  const stmt = db.prepare(
    "SELECT b.page_id, l.source_block_id FROM links l JOIN blocks b ON b.id = l.source_block_id WHERE l.target_type = 'page' AND l.target = ?"
  );
  stmt.bind([title]);
  while (stmt.step()) {
    const [pageId, blockId] = stmt.get() as [string, string];
    res.push({ sourcePage: pageId, sourceBlockId: blockId });
  }
  stmt.free();
  return res;
}

export function linksToBlock(db: Database, id: string): Backlink[] {
  const res: Backlink[] = [];
  const stmt = db.prepare(
    "SELECT b.page_id, l.source_block_id FROM links l JOIN blocks b ON b.id = l.source_block_id WHERE l.target_type = 'block' AND l.target = ?"
  );
  stmt.bind([id]);
  while (stmt.step()) {
    const [pageId, blockId] = stmt.get() as [string, string];
    res.push({ sourcePage: pageId, sourceBlockId: blockId });
  }
  stmt.free();
  return res;
}
