import { IndexData, BlockEntry } from "./write";

export function search(data: IndexData, term: string): BlockEntry[] {
  const q = term.toLowerCase();
  return Object.values(data.blocks).filter((b) => b.text.toLowerCase().includes(q));
}

export function backlinks(data: IndexData, page: string): BlockEntry[] {
  const ids = data.links[page] || [];
  return ids.map((id) => data.blocks[id]).filter(Boolean);
}
