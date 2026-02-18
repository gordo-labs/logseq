import path from './browser-path.js';
import type { FsAdapter } from '@logseq/fs-adapter';
import { Backlink } from '@logseq/model';
import { parseFile } from './parse.js';
import { InMemoryFileCore, Indices, LazyFileCore } from './read.js';

export async function createFileCore(root: string, adapter: FsAdapter) {
  const files = await adapter.listFiles(root);
  const mdFiles = files.filter((f: string) => f.endsWith('.md'));
  const indices: Indices = {
    pageByTitle: new Map(),
    blocksById: new Map(),
    childrenByParent: new Map(),
    backlinks: new Map()
  };
  const backlinkPairs: Array<{ key: string; value: Backlink }> = [];

  for (const file of mdFiles) {
    const content = await adapter.readFile(file);
    const parsed = parseFile(file, content);
    indices.pageByTitle.set(parsed.page.title, parsed.page);
    const pageKey = `page:${parsed.page.title}`;
    indices.childrenByParent.set(pageKey, []);
    for (const block of parsed.blocks) {
      indices.blocksById.set(block.id, block);
      const parent = block.parentId ?? pageKey;
      if (!indices.childrenByParent.has(parent)) {
        indices.childrenByParent.set(parent, []);
      }
      indices.childrenByParent.get(parent)!.push(block.id);
      for (const link of block.links) {
        const key = link.type === 'page' ? `page:${link.page}` : `block:${link.blockId}`;
        backlinkPairs.push({ key, value: { sourcePage: block.pageId, sourceBlockId: block.id } });
      }
    }
  }

  for (const { key, value } of backlinkPairs) {
    if (!indices.backlinks.has(key)) indices.backlinks.set(key, []);
    indices.backlinks.get(key)!.push(value);
  }

  return new InMemoryFileCore(indices);
}

export async function createFileCoreLazy(root: string, adapter: FsAdapter): Promise<LazyFileCore> {
  const indices: Indices = {
    pageByTitle: new Map(),
    blocksById: new Map(),
    childrenByParent: new Map(),
    backlinks: new Map()
  };

  const fileMap = new Map<string, string>();
  const fileStats = new Map<string, { mtimeMs: number }>();

  // List and index all markdown files
  const files = await adapter.listFiles(root);
  const mdFiles = files.filter((f: string) => f.endsWith('.md'));
  
  for (const file of mdFiles) {
    const stat = await adapter.stat(file);
    fileStats.set(file, stat);
    const filename = path.basename(file);
    const title = filename.replace(/\.md$/, '');
    const page: { id: string; title: string; path: string } = { id: title, title, path: file };
    indices.pageByTitle.set(title, page);
    fileMap.set(file, title);
  }

  return new LazyFileCore(indices, root, adapter, fileMap, fileStats);
}
