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
  constructor(private idx: Indices) {}

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

export type FileCore = InMemoryFileCore;
