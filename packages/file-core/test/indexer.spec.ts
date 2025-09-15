<<<<<<< ours
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
=======
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { Indexer } from "../src/indexer";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "graph-"));
const a = path.join(dir, "a.md");
const b = path.join(dir, "b.md");
fs.writeFileSync(a, "A page\n\n[[B]] link to B\n");
fs.writeFileSync(b, "B page\n");

const idx = new Indexer(dir);
idx.indexAll();

let results = idx.search("link");
assert.equal(results.length, 1);
assert.ok(results[0].text.includes("[[B]]"));

let bl = idx.backlinks("B");
assert.equal(bl.length, 1);
assert.ok(bl[0].text.includes("[[B]]"));

const fpBefore = idx.fingerprints[a];

fs.writeFileSync(b, "B page\n\nreference [[A]]\n");
idx.indexAll();

const fpAfter = idx.fingerprints[a];
assert.equal(fpBefore.hash, fpAfter.hash);

bl = idx.backlinks("A");
assert.equal(bl.length, 1);
assert.ok(bl[0].text.includes("[[A]]"));

console.log("indexer tests passed");
>>>>>>> theirs
