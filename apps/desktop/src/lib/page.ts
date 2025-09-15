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

export function loadPageSnapshot(core: FileCore, pageTitle: string): PageSnapshot {
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
  const children = childResult.ok
    ? childResult.value.map(child => buildNode(core, child))
    : [];
  return {
    block,
    children
  };
}

export function flattenTree(nodes: BlockNode[]): FlattenedBlock[] {
  const rows: FlattenedBlock[] = [];
  const walk = (arr: BlockNode[], parent: BlockNode | null, depth: number) => {
    arr.forEach((node, idx) => {
      rows.push({ node, depth, parent, index: idx });
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

export function insertBlock(
  nodes: BlockNode[],
  parentId: string | null,
  index: number,
  block: Block
): BlockNode[] {
  const cloned = cloneTree(nodes);
  const targetArray = parentId ? findNode(cloned, parentId)?.children : cloned;
  if (!targetArray) return cloned;
  const safeIndex = Math.max(0, Math.min(index, targetArray.length));
  targetArray.splice(safeIndex, 0, { block, children: [] });
  return cloned;
}

export function removeBlock(nodes: BlockNode[], blockId: string): BlockNode[] {
  const cloned = cloneTree(nodes);
  const parentInfo = findParent(cloned, blockId, null);
  if (!parentInfo) return cloned;
  const { siblings } = parentInfo;
  const index = siblings.findIndex(n => n.block.id === blockId);
  if (index >= 0) siblings.splice(index, 1);
  return cloned;
}

export function moveBlock(nodes: BlockNode[], blockId: string, direction: 'up' | 'down'): BlockNode[] {
  const cloned = cloneTree(nodes);
  const parentInfo = findParent(cloned, blockId, null);
  if (!parentInfo) return cloned;
  const { siblings } = parentInfo;
  const currentIndex = siblings.findIndex(n => n.block.id === blockId);
  if (currentIndex < 0) return cloned;
  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= siblings.length) return cloned;
  const [node] = siblings.splice(currentIndex, 1);
  siblings.splice(targetIndex, 0, node);
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

interface ParentInfo {
  parent: BlockNode | null;
  siblings: BlockNode[];
}

function findParent(nodes: BlockNode[], blockId: string, parent: BlockNode | null): ParentInfo | null {
  for (const node of nodes) {
    if (node.block.id === blockId) {
      return { parent, siblings: parent ? parent.children : nodes };
    }
    const child = findParent(node.children, blockId, node);
    if (child) return child;
  }
  return null;
}
