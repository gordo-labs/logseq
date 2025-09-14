import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import NodeFsAdapter from '@logseq/fs-adapter';
// TODO: use package import when sidecar-index is published
import { indexGraph } from '../src/indexer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixtureRoot = path.resolve(__dirname, '../../../../tools/fixtures/graph-root');

function setupTempGraph() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-'));
  fs.cpSync(fixtureRoot, tmp, { recursive: true });
  return tmp;
}

test('indexer reindexes changed files only and supports search', async () => {
  const root = setupTempGraph();
  const adapter = new NodeFsAdapter();

  let updated = await indexGraph(root, adapter);
  assert.deepEqual(updated.sort(), ['alpha.md', 'beta.md']);

  fs.appendFileSync(path.join(root, 'alpha.md'), '\n- new search term');
  updated = await indexGraph(root, adapter);
  assert.deepEqual(updated, ['alpha.md']);

  const modPath = path.resolve(__dirname, '../../../sidecar-index/dist/index.js');
  const mod = (await import(modPath)) as any;
  const sidecar = await mod.openSidecar(root);
  const searchRes = sidecar.search('search');
  assert.ok(searchRes.blocks.some((b: any) => b.text.includes('new search term')));

  const backlinks = sidecar.linksToPage('Beta');
  assert.ok(backlinks.some((b: any) => b.sourcePage === 'Alpha'));
});
