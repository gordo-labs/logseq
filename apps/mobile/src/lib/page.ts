import type { FileCore } from '@logseq/file-core';
import type { Block, Link, Page } from '@logseq/model';

const pageLinkRe = /\[\[([^\]]+)\]\]/g;
const blockLinkRe = /\(\(([^)]+)\)\)/g;

export interface BlockNode {
  block: Block;
  children: BlockNode[];
}

export interface FlattenedBlock {
  node: BlockNode;
  depth: number;
  parent: BlockNode | null;
  index: number;
}

export interface PageSnapshot {
  page: Page | null;
  nodes: BlockNode[];
}

export function loadPageSnapshot(core: FileCore | null, pageTitle: string): PageSnapshot {
  if (!core) return { page: null, nodes: [] };
  const pageResult = core.getPageByTitle(pageTitle);
  if (!pageResult.ok) {
    return { page: null, nodes: [] };
  }
  const page = pageResult.value;
  return { page, nodes: buildPageTree(core, page.id) };
}

export function buildPageTree(core: FileCore, pageId: string): BlockNode[] {
  const rootResult = core.listBlocksByPage(pageId);
  if (!rootResult.ok) return [];
  return rootResult.value.map(block => buildNode(core, block));
}

function buildNode(core: FileCore, block: Block): BlockNode {
  const childResult = core.listChildren(block.id);
  const children = childResult.ok ? childResult.value.map(child => buildNode(core, child)) : [];
  return { block, children };
}

export function flattenTree(nodes: BlockNode[]): FlattenedBlock[] {
  const rows: FlattenedBlock[] = [];
  const walk = (arr: BlockNode[], parent: BlockNode | null, depth: number) => {
    arr.forEach((node, index) => {
      rows.push({ node, depth, parent, index });
      if (node.children.length) {
        walk(node.children, node, depth + 1);
      }
    });
  };
  walk(nodes, null, 0);
  return rows;
}

export function cloneTree(nodes: BlockNode[]): BlockNode[] {
  return nodes.map(cloneNode);
}

export function updateBlockText(nodes: BlockNode[], blockId: string, text: string): BlockNode[] {
  const cloned = cloneTree(nodes);
  const target = findNode(cloned, blockId);
  if (target) {
    target.block = {
      ...target.block,
      text,
      links: extractLinks(text)
    };
  }
  return cloned;
}

export function insertBlock(nodes: BlockNode[], parentId: string | null, index: number, block: Block): BlockNode[] {
  const cloned = cloneTree(nodes);
  const targetArray = parentId ? findNode(cloned, parentId)?.children : cloned;
  if (!targetArray) return cloned;
  const safeIndex = Math.max(0, Math.min(index, targetArray.length));
  targetArray.splice(safeIndex, 0, { block, children: [] });
  return cloned;
}

export function extractLinks(text: string): Link[] {
  const links: Link[] = [];
  let match: RegExpExecArray | null;
  while ((match = pageLinkRe.exec(text))) {
    links.push({ type: 'page', page: match[1] });
  }
  while ((match = blockLinkRe.exec(text))) {
    links.push({ type: 'block', blockId: match[1] });
  }
  return links;
}

export function serializePage(title: string, nodes: BlockNode[]): string {
  const lines: string[] = [`title:: ${title}`];
  const write = (node: BlockNode, depth: number) => {
    const indent = '  '.repeat(depth);
    const text = node.block.text.trim();
    const base = `${indent}- id:: ${node.block.id}`;
    lines.push(text ? `${base} ${text}` : base);
    node.children.forEach(child => write(child, depth + 1));
  };
  nodes.forEach(node => write(node, 0));
  return lines.join('\n') + '\n';
}

export function createBlock(pageId: string, text: string, parentId: string | null = null): Block {
  return {
    id: generateBlockId(pageId),
    pageId,
    parentId,
    text,
    links: extractLinks(text)
  };
}

export function generateBlockId(pageId: string): string {
  const base = pageId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${base || 'block'}-${timestamp}-${random}`;
}

function cloneNode(node: BlockNode): BlockNode {
  return {
    block: {
      ...node.block,
      links: [...node.block.links]
    },
    children: node.children.map(cloneNode)
  };
}

function findNode(nodes: BlockNode[], blockId: string): BlockNode | null {
  for (const node of nodes) {
    if (node.block.id === blockId) return node;
    const child = findNode(node.children, blockId);
    if (child) return child;
  }
  return null;
}
