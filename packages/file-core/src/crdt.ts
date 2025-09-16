import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parseFile, type ParsedData } from './parse.js';
import { writeFiles } from './write.js';

const CRDT_DIR = '.graph/crdt';

export interface LamportTimestamp {
  time: number;
  actor: string;
}

interface BlockState {
  id: string;
  text: string;
  parentId: string | null;
  lastUpdate: LamportTimestamp;
}

export interface CrdtDoc {
  pageId: string;
  title: string;
  path: string;
  blocks: Map<string, BlockState>;
  children: Map<string, string[]>;
  clock: Record<string, number>;
  tombstones: Map<string, LamportTimestamp>;
}

export interface BlockContent {
  id: string;
  text: string;
  parentId: string | null;
  index?: number;
}

export type BlockChange =
  | { type: 'upsert'; block: BlockContent }
  | { type: 'remove'; id: string };

interface UpsertOperation {
  kind: 'upsert';
  block: BlockContent;
  timestamp: LamportTimestamp;
}

interface RemoveOperation {
  kind: 'remove';
  id: string;
  timestamp: LamportTimestamp;
}

export type CrdtOperation = UpsertOperation | RemoveOperation;

export interface CrdtDelta {
  actor: string;
  docPath: string;
  operations: CrdtOperation[];
  clock: Record<string, number>;
}

interface SerializedBlock {
  id: string;
  text: string;
  parentId: string | null;
  lastUpdate: LamportTimestamp;
}

interface SerializedDoc {
  pageId: string;
  title: string;
  path: string;
  clock: Record<string, number>;
  blocks: Record<string, SerializedBlock>;
  children: Record<string, string[]>;
  tombstones: Record<string, LamportTimestamp>;
}

const ROOT_PREFIX = 'page:';
const BLOCK_PREFIX = 'block:';

function compareTimestamp(a: LamportTimestamp, b: LamportTimestamp): number {
  if (a.time !== b.time) return a.time - b.time;
  if (a.actor < b.actor) return -1;
  if (a.actor > b.actor) return 1;
  return 0;
}

function normalizePagePath(pagePath: string): string {
  let normalized = pagePath.replace(/\\/g, '/');
  if (normalized.startsWith('./')) normalized = normalized.slice(2);
  normalized = normalized.replace(/^\/+/, '');
  if (!normalized) return '';
  normalized = path.posix.normalize(normalized);
  if (normalized === '.') return '';
  if (normalized.startsWith('..')) {
    throw new Error(`Invalid page path outside root: ${pagePath}`);
  }
  return normalized;
}

function toCrdtFilename(normalizedPath: string): string {
  const safe = normalizedPath
    .replace(/\//g, '__')
    .replace(/[^A-Za-z0-9._-]/g, '_');
  return `${safe || 'index'}.json`;
}

function parentKey(pageId: string, parentId: string | null): string {
  return parentId ? `${BLOCK_PREFIX}${parentId}` : `${ROOT_PREFIX}${pageId}`;
}

function blockKey(id: string): string {
  return `${BLOCK_PREFIX}${id}`;
}

function ensureChildren(doc: CrdtDoc, key: string): string[] {
  let existing = doc.children.get(key);
  if (!existing) {
    existing = [];
    doc.children.set(key, existing);
  }
  return existing;
}

function removeChild(list: string[] | undefined, id: string) {
  if (!list) return;
  const idx = list.indexOf(id);
  if (idx >= 0) list.splice(idx, 1);
}

function insertChild(list: string[], id: string, index?: number) {
  const existingIdx = list.indexOf(id);
  if (existingIdx >= 0) {
    list.splice(existingIdx, 1);
  }
  if (index === undefined || Number.isNaN(index)) {
    list.push(id);
    return;
  }
  if (index <= 0) {
    list.unshift(id);
    return;
  }
  if (index >= list.length) {
    list.push(id);
    return;
  }
  list.splice(index, 0, id);
}

function gatherDescendants(doc: CrdtDoc, id: string, acc: string[] = []): string[] {
  acc.push(id);
  const childList = doc.children.get(blockKey(id));
  if (!childList) return acc;
  for (const child of childList) {
    gatherDescendants(doc, child, acc);
  }
  return acc;
}

function applyUpsert(doc: CrdtDoc, op: UpsertOperation) {
  const ts = op.timestamp;
  const tombstone = doc.tombstones.get(op.block.id);
  if (tombstone && compareTimestamp(ts, tombstone) <= 0) {
    return;
  }
  const existing = doc.blocks.get(op.block.id);
  const targetParentKey = parentKey(doc.pageId, op.block.parentId);
  if (!existing) {
    doc.blocks.set(op.block.id, {
      id: op.block.id,
      text: op.block.text,
      parentId: op.block.parentId,
      lastUpdate: ts
    });
    insertChild(ensureChildren(doc, targetParentKey), op.block.id, op.block.index);
    ensureChildren(doc, blockKey(op.block.id));
    doc.tombstones.delete(op.block.id);
    return;
  }
  if (compareTimestamp(ts, existing.lastUpdate) < 0) {
    return;
  }
  if (existing.parentId !== op.block.parentId) {
    const prevKey = parentKey(doc.pageId, existing.parentId);
    removeChild(doc.children.get(prevKey), existing.id);
  }
  existing.text = op.block.text;
  existing.parentId = op.block.parentId;
  existing.lastUpdate = ts;
  insertChild(ensureChildren(doc, targetParentKey), op.block.id, op.block.index);
  doc.tombstones.delete(op.block.id);
}

function applyRemove(doc: CrdtDoc, op: RemoveOperation) {
  const ts = op.timestamp;
  const tombstone = doc.tombstones.get(op.id);
  if (tombstone && compareTimestamp(ts, tombstone) <= 0) {
    return;
  }
  const existing = doc.blocks.get(op.id);
  if (existing && compareTimestamp(ts, existing.lastUpdate) < 0) {
    return;
  }
  const targets = existing ? gatherDescendants(doc, op.id) : [op.id];
  for (const target of targets) {
    const block = doc.blocks.get(target);
    if (block) {
      const parent = parentKey(doc.pageId, block.parentId);
      removeChild(doc.children.get(parent), block.id);
      doc.blocks.delete(block.id);
    }
    doc.children.delete(blockKey(target));
    doc.tombstones.set(target, ts);
  }
}

function applyOperation(doc: CrdtDoc, op: CrdtOperation) {
  if (op.kind === 'upsert') {
    applyUpsert(doc, op);
  } else {
    applyRemove(doc, op);
  }
}

function createDocFromParsed(pagePath: string, parsed: ParsedData): CrdtDoc {
  const doc: CrdtDoc = {
    pageId: parsed.page.id,
    title: parsed.page.title,
    path: pagePath,
    blocks: new Map(),
    children: new Map(),
    clock: {},
    tombstones: new Map()
  };
  ensureChildren(doc, parentKey(doc.pageId, null));
  for (const block of parsed.blocks) {
    doc.blocks.set(block.id, {
      id: block.id,
      text: block.text,
      parentId: block.parentId,
      lastUpdate: { time: 0, actor: 'origin' }
    });
    const parent = parentKey(doc.pageId, block.parentId);
    insertChild(ensureChildren(doc, parent), block.id);
    ensureChildren(doc, blockKey(block.id));
  }
  return doc;
}

function serializeDoc(doc: CrdtDoc): SerializedDoc {
  const blocks: Record<string, SerializedBlock> = {};
  for (const [id, block] of doc.blocks) {
    blocks[id] = {
      id: block.id,
      text: block.text,
      parentId: block.parentId,
      lastUpdate: block.lastUpdate
    };
  }
  const children: Record<string, string[]> = {};
  for (const [key, list] of doc.children) {
    children[key] = [...list];
  }
  const tombstones: Record<string, LamportTimestamp> = {};
  for (const [id, ts] of doc.tombstones) {
    tombstones[id] = ts;
  }
  return {
    pageId: doc.pageId,
    title: doc.title,
    path: doc.path,
    clock: { ...doc.clock },
    blocks,
    children,
    tombstones
  };
}

function deserializeDoc(data: SerializedDoc): CrdtDoc {
  const blocksEntries = Object.entries(data.blocks).map(([id, block]) => [id, { ...block } as BlockState]);
  const childrenEntries = Object.entries(data.children).map(([key, list]) => [key, [...list]] as const);
  const tombstoneEntries = Object.entries(data.tombstones).map(([id, ts]) => [id, ts] as const);
  return {
    pageId: data.pageId,
    title: data.title,
    path: data.path,
    clock: { ...data.clock },
    blocks: new Map(blocksEntries),
    children: new Map(childrenEntries),
    tombstones: new Map(tombstoneEntries)
  };
}

export class CrdtManager {
  constructor(private readonly root: string) {}

  getCrdtPath(pagePath: string): string {
    const normalized = normalizePagePath(pagePath);
    return path.posix.join(CRDT_DIR, toCrdtFilename(normalized));
  }

  async load(pagePath: string): Promise<CrdtDoc> {
    const normalized = normalizePagePath(pagePath);
    const crdtRel = this.getCrdtPath(normalized);
    const crdtAbs = path.join(this.root, crdtRel);
    try {
      const raw = await fs.readFile(crdtAbs, 'utf8');
      const data = JSON.parse(raw) as SerializedDoc;
      return deserializeDoc(data);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw err;
    }
    const abs = path.join(this.root, normalized);
    const content = await fs.readFile(abs, 'utf8');
    const parsed = parseFile(normalized, content);
    return createDocFromParsed(normalized, parsed);
  }

  async persist(doc: CrdtDoc): Promise<void> {
    const markdown = docToMarkdown(doc);
    const crdt = JSON.stringify(serializeDoc(doc), null, 2);
    const crdtRel = this.getCrdtPath(doc.path);
    await writeFiles(this.root, [
      { path: doc.path, content: markdown },
      { path: crdtRel, content: crdt }
    ]);
  }
}

export function createDelta(doc: CrdtDoc, actor: string, changes: BlockChange[]): CrdtDelta {
  if (!changes.length) {
    return { actor, docPath: doc.path, operations: [], clock: { ...doc.clock } };
  }
  const operations: CrdtOperation[] = [];
  let counter = doc.clock[actor] ?? 0;
  for (const change of changes) {
    counter += 1;
    const timestamp: LamportTimestamp = { time: counter, actor };
    let operation: CrdtOperation;
    if (change.type === 'upsert') {
      operation = { kind: 'upsert', block: change.block, timestamp };
    } else {
      operation = { kind: 'remove', id: change.id, timestamp };
    }
    applyOperation(doc, operation);
    operations.push(operation);
  }
  doc.clock[actor] = counter;
  return { actor, docPath: doc.path, operations, clock: { ...doc.clock } };
}

export function applyDelta(doc: CrdtDoc, delta: CrdtDelta): void {
  const sorted = [...delta.operations].sort((a, b) => compareTimestamp(a.timestamp, b.timestamp));
  for (const op of sorted) {
    applyOperation(doc, op);
  }
  for (const [actor, time] of Object.entries(delta.clock)) {
    const current = doc.clock[actor] ?? 0;
    if (time > current) {
      doc.clock[actor] = time;
    }
  }
}

export function docToMarkdown(doc: CrdtDoc): string {
  const lines: string[] = [`title:: ${doc.title}`];
  const emit = (parent: string, depth: number) => {
    const children = doc.children.get(parent) || [];
    for (const id of children) {
      const block = doc.blocks.get(id);
      if (!block) continue;
      const prefix = '  '.repeat(depth);
      const textPart = block.text ? ` ${block.text}` : '';
      lines.push(`${prefix}- id:: ${block.id}${textPart}`);
      emit(blockKey(id), depth + 1);
    }
  };
  emit(parentKey(doc.pageId, null), 0);
  return lines.join('\n');
}
