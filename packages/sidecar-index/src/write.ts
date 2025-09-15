import path from "node:path";

export interface BlockEntry {
  id: string;
  text: string;
  links: string[];
}

export interface FileEntry {
  page: string;
  blocks: BlockEntry[];
}

export interface IndexData {
  files: Record<string, FileEntry>;
  blocks: Record<string, BlockEntry>;
  links: Record<string, string[]>; // page -> block ids
}

export function updateFile(data: IndexData, filePath: string, content: string) {
  const page = path.basename(filePath, path.extname(filePath));
  const lines = content.split(/\r?\n/);
  const blocks: BlockEntry[] = [];
  const newLinks: Record<string, string[]> = {};
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    const id = `${filePath}:${i}`;
    const matches = [...text.matchAll(/\[\[([^\]]+)\]\]/g)];
    const linkPages = matches.map((m) => m[1]);
    blocks.push({ id, text, links: linkPages });
    for (const l of linkPages) {
      if (!newLinks[l]) newLinks[l] = [];
      newLinks[l].push(id);
    }
  }

  // Remove old blocks/links
  const prev = data.files[filePath];
  if (prev) {
    for (const b of prev.blocks) {
      delete data.blocks[b.id];
      for (const l of b.links) {
        const arr = data.links[l];
        if (arr) {
          data.links[l] = arr.filter((id) => id !== b.id);
          if (data.links[l].length === 0) delete data.links[l];
        }
      }
    }
  }

  // Add new blocks/links
  data.files[filePath] = { page, blocks };
  for (const b of blocks) {
    data.blocks[b.id] = b;
  }
  for (const [p, ids] of Object.entries(newLinks)) {
    data.links[p] = [...(data.links[p] || []), ...ids];
  }
}
