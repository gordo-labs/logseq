import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Database } from 'sql.js';
import type { Page, Block } from '@logseq/model';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readSql(file: string): Promise<string> {
  const p = path.join(__dirname, '..', 'src', file);
  return fs.readFile(p, 'utf8');
}

export async function applySchema(db: Database) {
  const schema = await readSql('schema.sql');
  db.run(schema);
}

export function updatePage(db: Database, page: Page, blocks: Block[]) {
  db.run('DELETE FROM pages WHERE id = ?', [page.id]);
  db.run('DELETE FROM links WHERE source_block_id IN (SELECT id FROM blocks WHERE page_id = ?)', [page.id]);
  db.run('DELETE FROM blocks WHERE page_id = ?', [page.id]);

  db.run('INSERT INTO pages (id, title, path) VALUES (?, ?, ?)', [page.id, page.title, page.path]);

  for (const b of blocks) {
    db.run('INSERT INTO blocks (id, page_id, parent_id, text) VALUES (?, ?, ?, ?)', [b.id, b.pageId, b.parentId, b.text]);
    for (const l of b.links) {
      if (l.type === 'page') {
        db.run('INSERT INTO links (source_block_id, target_type, target) VALUES (?, ?, ?)', [b.id, 'page', l.page]);
      } else {
        db.run('INSERT INTO links (source_block_id, target_type, target) VALUES (?, ?, ?)', [b.id, 'block', l.blockId]);
      }
    }
  }
}

export async function saveDb(db: Database, dbPath: string) {
  const data = db.export();
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(dbPath, Buffer.from(data));
}
