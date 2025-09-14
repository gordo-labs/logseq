import { test } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createFileCore } from '../src/index.js';
import NodeFsAdapter from '@logseq/fs-adapter';
import type { Page, Block } from '@logseq/model';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../../../../tools/fixtures/graph-root');

test('read api basics', async () => {
  const core = await createFileCore(root, new NodeFsAdapter());
  const pages = core.listPages();
  assert.ok(pages.ok);
  assert.deepEqual(pages.value.map((p: Page) => p.title).sort(), ['Alpha', 'Beta']);

  const alpha = core.getPageByTitle('Alpha');
  assert.ok(alpha.ok && alpha.value);

  const blocksAlpha = core.listBlocksByPage('Alpha');
  assert.ok(blocksAlpha.ok);
  assert.equal(blocksAlpha.value[0].id, 'alpha-block');

  const children = core.listChildren('alpha-block');
  assert.ok(children.ok);
  assert.equal(children.value.length, 1);
  assert.equal(children.value[0].text, 'alpha child');

  const linksToBeta = core.listLinksToPage('Beta');
  assert.ok(linksToBeta.ok);
  assert.equal(linksToBeta.value[0].sourcePage, 'Alpha');

  const linksToAlphaBlock = core.listLinksToBlock('alpha-block');
  assert.ok(linksToAlphaBlock.ok);
  assert.equal(linksToAlphaBlock.value[0].sourcePage, 'Beta');

  const searchRes = core.search('child');
  assert.ok(searchRes.ok);
  assert.ok(searchRes.value.blocks.some((b: Block) => b.text.includes('child')));
});
