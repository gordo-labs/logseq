export interface Page {
  id: string;
  title: string;
  path: string;
}

export interface LinkToPage {
  type: 'page';
  page: string;
}

export interface LinkToBlock {
  type: 'block';
  blockId: string;
}

export type Link = LinkToPage | LinkToBlock;

export interface Block {
  id: string;
  pageId: string;
  parentId: string | null;
  text: string;
  links: Link[];
}

export interface Backlink {
  sourcePage: string;
  sourceBlockId?: string;
}

export interface SearchResult {
  pages: Page[];
  blocks: Block[];
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: Error };
