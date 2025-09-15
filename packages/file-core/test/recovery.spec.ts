import { appendWal, readWal } from '../src/wal.js';
import { recover } from '../src/write.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('replays wal entries on recovery', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'graph-'));
  await appendWal(root, { ops: [{ path: 'alpha.md', content: 'Alpha' }] });
  await recover(root);
  const data = await fs.readFile(path.join(root, 'alpha.md'), 'utf8');
  assert.equal(data, 'Alpha');
  const wal = await readWal(root);
  assert.equal(wal.length, 0);
});
