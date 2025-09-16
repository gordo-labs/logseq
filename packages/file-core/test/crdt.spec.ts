import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CrdtManager, createDelta, applyDelta, docToMarkdown } from '../src/crdt.js';

test('merges multi-writer updates and persists to disk', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'logseq-crdt-'));
  const pagePath = 'pages/alpha.md';
  await mkdir(path.join(root, path.dirname(pagePath)), { recursive: true });
  await writeFile(path.join(root, pagePath), 'title:: Alpha\n', 'utf8');

  const manager = new CrdtManager(root);
  const aliceDoc = await manager.load(pagePath);
  const bobDoc = await manager.load(pagePath);

  const deltaAlice = createDelta(aliceDoc, 'alice', [
    { type: 'upsert', block: { id: 'alice-block', parentId: null, text: 'Alice was here' } }
  ]);
  applyDelta(bobDoc, deltaAlice);

  const deltaBob = createDelta(bobDoc, 'bob', [
    { type: 'upsert', block: { id: 'bob-block', parentId: null, text: 'Bob too' } }
  ]);
  applyDelta(aliceDoc, deltaBob);

  await manager.persist(aliceDoc);

  const markdown = await readFile(path.join(root, pagePath), 'utf8');
  assert.ok(markdown.includes('alice-block'));
  assert.ok(markdown.includes('Bob too'));

  const crdtRel = manager.getCrdtPath(pagePath);
  const crdtFile = path.join(root, crdtRel);
  const stored = JSON.parse(await readFile(crdtFile, 'utf8'));
  assert.deepEqual(Object.keys(stored.blocks).sort(), ['alice-block', 'bob-block']);

  const reloaded = await manager.load(pagePath);
  const serialized = docToMarkdown(reloaded);
  assert.equal(serialized, markdown.trim());
});
