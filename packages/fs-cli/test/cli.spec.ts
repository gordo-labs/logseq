import { test } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const bin = path.resolve(__dirname, '..', 'bin', 'logseqfs');

test('help prints', () => {
  const res = spawnSync('node', [bin, '--help']);
  assert.equal(res.status, 0);
  assert.match(res.stdout.toString(), /Usage: logseqfs/);
});

test('init creates .graph', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-'));
  const res = spawnSync('node', [bin, 'init', dir]);
  assert.equal(res.status, 0);
  assert.ok(fs.existsSync(path.join(dir, '.graph')));
});

for (const cmd of ['reindex', 'verify', 'compact', 'convert-legacy']) {
  test(`${cmd} runs`, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-'));
    const res = spawnSync('node', [bin, cmd, dir]);
    assert.equal(res.status, 0);
  });
}
