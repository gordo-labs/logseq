import { type ParsedData } from './parse.js';

export interface BlockConflict {
  id: string;
  ours: string;
  theirs: string;
}

export interface Conflict {
  file: string;
  blocks: BlockConflict[];
}

export function detectConflicts(ours: ParsedData, theirs: ParsedData): Conflict | null {
  const map = new Map(ours.blocks.map(b => [b.id, b.text]));
  const conflicts: BlockConflict[] = [];
  for (const b of theirs.blocks) {
    const prev = map.get(b.id);
    if (prev !== undefined && prev !== b.text) {
      conflicts.push({ id: b.id, ours: prev, theirs: b.text });
    }
  }
  return conflicts.length ? { file: theirs.page.path, blocks: conflicts } : null;
}

/** Simple merge strategy: prefer "theirs" */
export function merge(_ours: ParsedData, theirs: ParsedData): ParsedData {
  return theirs;
}
