import type { FsAdapter } from './logseq-fs-adapter';
import type { Backlink, Block, Page, Result, SearchResult } from './logseq-model';

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

export function createFileCore(root: string, adapter: FsAdapter): Promise<FileCore>;
export function watchGraph(adapter: FsAdapter, dir: string): unknown;
