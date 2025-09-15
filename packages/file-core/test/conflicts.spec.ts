import { test } from 'node:test';
import assert from 'node:assert/strict';
import { watchGraph } from '../src/watch.js';
import { parseFile } from '../src/parse.js';
import type { FsAdapter, WatchHandler, Watcher } from '@logseq/fs-adapter';

class FakeAdapter implements FsAdapter {
  constructor(public files: Record<string, string>) {}
  async readFile(path: string): Promise<string> {
    return this.files[path];
  }
  async stat(path: string): Promise<{ mtimeMs: number; size: number }> {
    const content = this.files[path];
    return { mtimeMs: Date.now(), size: content.length };
  }
  watch(_dir: string, handler: WatchHandler): Watcher {
    this.handler = handler;
    return { close() {} };
  }
  handler?: WatchHandler;
  async writeFile(path: string, content: string) {
    this.files[path] = content;
    this.handler?.({ type: 'change', path });
  }
}

test('detects external edits and surfaces conflict', async () => {
  const file = '/alpha.md';
  const base = 'title:: Alpha\n- id:: a1 one';
  const adapter = new FakeAdapter({ [file]: base });
  const parsed = parseFile(file, base);
  let conflict: any = null;
  let updated: any = null;
  watchGraph(adapter, '/', {
    initial: { [file]: parsed },
    onConflict: c => { conflict = c; },
    onUpdate: (_f, data) => { updated = data; }
  });

  const theirs = 'title:: Alpha\n- id:: a1 two';
  await adapter.writeFile(file, theirs);

  assert.ok(conflict, 'conflict should be reported');
  assert.equal(conflict.blocks[0].theirs, 'two');
  assert.ok(updated); 
  assert.equal(updated.blocks[0].text, 'two');
});
