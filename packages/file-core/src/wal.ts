import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface WalEntry {
  ops: { path: string; content: string }[];
}

const WAL_FILE = path.join('.graph', 'wal.log');

export async function appendWal(root: string, entry: WalEntry): Promise<void> {
  const file = path.join(root, WAL_FILE);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.appendFile(file, JSON.stringify(entry) + '\n', 'utf8');
}

export async function readWal(root: string): Promise<WalEntry[]> {
  const file = path.join(root, WAL_FILE);
  try {
    const txt = await fs.readFile(file, 'utf8');
    return txt
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line) as WalEntry);
  } catch (e: any) {
    if (e && e.code === 'ENOENT') return [];
    throw e;
  }
}

export async function clearWal(root: string): Promise<void> {
  const file = path.join(root, WAL_FILE);
  await fs.rm(file, { force: true });
}
