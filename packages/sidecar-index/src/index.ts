import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs, { Database } from 'sql.js';
import type { Page, Block, SearchResult, Backlink } from '@logseq/model';
import { applySchema, updatePage, saveDb } from './write.js';
import { search, linksToPage, linksToBlock } from './read.js';

export interface SidecarIndex {
  update(page: Page, blocks: Block[]): void;
  save(): Promise<void>;
  search(q: string): SearchResult;
  linksToPage(title: string): Backlink[];
  linksToBlock(id: string): Backlink[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function openSidecar(root: string): Promise<SidecarIndex> {
  const dir = path.join(root, '.graph');
  await fs.mkdir(dir, { recursive: true });
  const dbPath = path.join(dir, 'index.sqlite');
  const SQL = await initSqlJs({ locateFile: (file: string) => path.join(__dirname, '../node_modules/sql.js/dist', file) });
  let db: Database;
  if (await exists(dbPath)) {
    const buf = await fs.readFile(dbPath);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
    await applySchema(db);
  }
  return {
    update: (p: Page, b: Block[]) => updatePage(db, p, b),
    save: () => saveDb(db, dbPath),
    search: (q: string) => search(db, q),
    linksToPage: (t: string) => linksToPage(db, t),
    linksToBlock: (i: string) => linksToBlock(db, i)
  };
}

async function exists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
