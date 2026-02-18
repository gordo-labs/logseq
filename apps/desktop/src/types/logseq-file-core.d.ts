import type { FsAdapter } from './logseq-fs-adapter';
import type { Backlink, Block, Page, Result, SearchResult } from './logseq-model';

export interface Indices {
  pageByTitle: Map<string, Page>;
  blocksById: Map<string, Block>;
  childrenByParent: Map<string, string[]>;
  backlinks: Map<string, Backlink[]>;
}

export interface FileCore {
  getPage(id: string): Result<Page>;
  getPageByTitle(title: string): Result<Page>;
  listPages(): Result<Page[]>;
  getBlock(id: string): Result<Block>;
  listBlocksByPage(pageId: string): Result<Block[]>;
  listChildren(parentId: string): Result<Block[]>;
  listLinksToPage(title: string): Result<Backlink[]>;
  listLinksToBlock(id: string): Result<Backlink[]>;
  search(query: string): Result<SearchResult>;
}

export class InMemoryFileCore implements FileCore {
  constructor(idx: Indices);
  getPage(id: string): Result<Page>;
  getPageByTitle(title: string): Result<Page>;
  listPages(): Result<Page[]>;
  getBlock(id: string): Result<Block>;
  listBlocksByPage(pageId: string): Result<Block[]>;
  listChildren(parentId: string): Result<Block[]>;
  listLinksToPage(title: string): Result<Backlink[]>;
  listLinksToBlock(id: string): Result<Backlink[]>;
  search(query: string): Result<SearchResult>;
}

export class LazyFileCore extends InMemoryFileCore {
  constructor(
    idx: Indices,
    root: string,
    adapter: FsAdapter,
    fileMap: Map<string, string>,
    fileStats: Map<string, { mtimeMs: number }>
  );
  loadPageOnDemand(title: string): Promise<void>;
  listBlocksByPage(pageId: string): Result<Block[]>;
  getBlock(id: string): Result<Block>;
}

export function createFileCore(root: string, adapter: FsAdapter): Promise<InMemoryFileCore>;
export function createFileCoreLazy(root: string, adapter: FsAdapter): Promise<LazyFileCore>;
// watchGraph disabled for browser compatibility
