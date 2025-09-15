import { writeFiles } from '../src/write.js';
import { readWal } from '../src/wal.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { test } from 'node:test';
import assert from 'node:assert/strict';

test('writes files and clears wal', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'graph-'));
  await writeFiles(root, [{ path: 'alpha.md', content: 'Alpha' }]);
  const data = await fs.readFile(path.join(root, 'alpha.md'), 'utf8');
  assert.equal(data, 'Alpha');
  const wal = await readWal(root);
  assert.equal(wal.length, 0);
});
