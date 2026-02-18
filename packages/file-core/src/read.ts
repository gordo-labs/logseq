import {
  Page,
  Block,
  Backlink,
  SearchResult,
  Result
} from '@logseq/model';
import { NotFoundError } from './errors.js';

export interface Indices {
  pageByTitle: Map<string, Page>;
  blocksById: Map<string, Block>;
  childrenByParent: Map<string, string[]>;
  backlinks: Map<string, Backlink[]>;
}

function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

function notFound(msg: string): Result<never> {
  return { ok: false, error: new NotFoundError(msg) };
}

export class InMemoryFileCore {
  constructor(protected idx: Indices) {}

  getPage(id: string): Result<Page> {
    const p = this.idx.pageByTitle.get(id);
    return p ? ok(p) : notFound(`page ${id} not found`);
    }

  getPageByTitle(title: string): Result<Page> {
    return this.getPage(title);
  }

  listPages(): Result<Page[]> {
    return ok(Array.from(this.idx.pageByTitle.values()));
  }

  getBlock(id: string): Result<Block> {
    const b = this.idx.blocksById.get(id);
    return b ? ok(b) : notFound(`block ${id} not found`);
  }

  listBlocksByPage(pageId: string): Result<Block[]> {
    const ids = this.idx.childrenByParent.get(`page:${pageId}`) || [];
    return ok(ids.map(id => this.idx.blocksById.get(id)!).filter(Boolean));
  }

  listChildren(parentId: string): Result<Block[]> {
    const ids = this.idx.childrenByParent.get(parentId) || [];
    return ok(ids.map(id => this.idx.blocksById.get(id)!).filter(Boolean));
  }

  listLinksToPage(title: string): Result<Backlink[]> {
    return ok(this.idx.backlinks.get(`page:${title}`) || []);
  }

  listLinksToBlock(id: string): Result<Backlink[]> {
    return ok(this.idx.backlinks.get(`block:${id}`) || []);
  }

  search(q: string): Result<SearchResult> {
    const query = q.toLowerCase();
    const pages = Array.from(this.idx.pageByTitle.values()).filter(p =>
      p.title.toLowerCase().includes(query)
    );
    const blocks = Array.from(this.idx.blocksById.values()).filter(b =>
      b.text.toLowerCase().includes(query)
    );
    return ok({ pages, blocks });
  }
}

import type { FsAdapter } from '@logseq/fs-adapter';
import { parseFile } from './parse.js';

export class LazyFileCore extends InMemoryFileCore {
  private loadedPages = new Set<string>();
  private loadingPages = new Set<string>();

  constructor(
    idx: Indices,
    private root: string,
    private adapter: FsAdapter,
    private fileMap: Map<string, string>,
    private fileStats: Map<string, { mtimeMs: number }>
  ) {
    super(idx);
  }

  async loadPageOnDemand(title: string): Promise<void> {
    if (this.loadedPages.has(title) || this.loadingPages.has(title)) {
      return;
    }

    this.loadingPages.add(title);
    try {
      const page = this.idx.pageByTitle.get(title);
      if (!page) return;

      const file = page.path;
      const content = await this.adapter.readFile(file);
      const parsed = parseFile(file, content);
      
      const pageKey = `page:${title}`;
      this.idx.childrenByParent.set(pageKey, []);
      
      const backlinkPairs: Array<{ key: string; value: Backlink }> = [];
      
      for (const block of parsed.blocks) {
        this.idx.blocksById.set(block.id, block);
        const parent = block.parentId ?? pageKey;
        if (!this.idx.childrenByParent.has(parent)) {
          this.idx.childrenByParent.set(parent, []);
        }
        this.idx.childrenByParent.get(parent)!.push(block.id);
        for (const link of block.links) {
          const key = link.type === 'page' ? `page:${link.page}` : `block:${link.blockId}`;
          backlinkPairs.push({ key, value: { sourcePage: block.pageId, sourceBlockId: block.id } });
        }
      }

      for (const { key, value } of backlinkPairs) {
        if (!this.idx.backlinks.has(key)) this.idx.backlinks.set(key, []);
        this.idx.backlinks.get(key)!.push(value);
      }

      this.loadedPages.add(title);
    } finally {
      this.loadingPages.delete(title);
    }
  }

  override listBlocksByPage(pageId: string): Result<Block[]> {
    if (!this.loadedPages.has(pageId)) {
      return ok([]);
    }
    return super.listBlocksByPage(pageId);
  }

  override getBlock(id: string): Result<Block> {
    const block = this.idx.blocksById.get(id);
    if (block) {
      return ok(block);
    }
    return notFound(`block ${id} not found`);
  }
}

export type FileCore = InMemoryFileCore | LazyFileCore;
