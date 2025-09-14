import path from 'node:path';
import { Block, Link, Page } from '@logseq/model';

export interface ParsedData {
  page: Page;
  blocks: Block[];
}

const pageLinkRe = /\[\[([^\]]+)\]\]/g;
const blockLinkRe = /\(\(([^)]+)\)\)/g;

export function parseFile(filePath: string, content: string): ParsedData {
  const lines = content.split(/\r?\n/);
  const filename = path.basename(filePath, path.extname(filePath));
  let title = filename;
  const blocks: Block[] = [];
  const stack: Array<{ indent: number; id: string }> = [];
  let counter = 0;

  for (const raw of lines) {
    if (!raw.trim()) continue;
    const prop = raw.match(/^([A-Za-z0-9_-]+)::\s*(.+)$/);
    if (prop && !raw.trimStart().startsWith('-')) {
      if (prop[1] === 'title') title = prop[2].trim();
      continue;
    }
    const m = raw.match(/^(\s*)-\s+(.*)$/);
    if (!m) continue;
    const indent = m[1].length;
    let text = m[2];
    let idMatch = text.match(/^id::\s*(\S+)\s*(.*)$/);
    let id = '';
    if (idMatch) {
      id = idMatch[1];
      text = idMatch[2];
    }
    const links: Link[] = [];
    let l: RegExpExecArray | null;
    while ((l = pageLinkRe.exec(text))) {
      links.push({ type: 'page', page: l[1] });
    }
    while ((l = blockLinkRe.exec(text))) {
      links.push({ type: 'block', blockId: l[1] });
    }
    if (!id) {
      counter += 1;
      id = `${filename}-${counter}`;
    }
    while (stack.length && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    const parentId = stack.length ? stack[stack.length - 1].id : null;
    const block: Block = { id, pageId: title, parentId, text: text.trim(), links };
    blocks.push(block);
    stack.push({ indent, id });
  }

  const page: Page = { id: title, title, path: filePath };
  return { page, blocks };
}
