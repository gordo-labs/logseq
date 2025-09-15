import { promises as fs } from 'node:fs';
import path from 'node:path';
import { appendWal, clearWal, WalEntry } from './wal.js';

export interface WriteFileOperation {
  path: string;
  content: string;
}

/**
 * Write a set of files atomically using a simple write-ahead log.
 * This is a simplified placeholder for the full transactional logic.
 */
export async function writeFiles(root: string, ops: WriteFileOperation[]): Promise<void> {
  if (!ops.length) return;
  const entry: WalEntry = { ops };
  await appendWal(root, entry);
  for (const op of ops) {
    const abs = path.join(root, op.path);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    const tmp = abs + '.tmp';
    await fs.writeFile(tmp, op.content, 'utf8');
    await fs.rename(tmp, abs);
  }
  await clearWal(root);
}

/** Recover from a previous crash by replaying any WAL entries. */
export async function recover(root: string): Promise<void> {
  const entries = await import('./wal.js').then(m => m.readWal(root));
  if (!entries.length) return;
  for (const entry of entries) {
    for (const op of entry.ops) {
      const abs = path.join(root, op.path);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      const tmp = abs + '.tmp';
      await fs.writeFile(tmp, op.content, 'utf8');
      await fs.rename(tmp, abs);
    }
  }
  await clearWal(root);
}
