import crypto from 'node:crypto';
import type { FsAdapter, WatchHandler } from '@logseq/fs-adapter';

type WatchEvent = 'add' | 'change' | 'unlink';
import { parseFile, type ParsedData } from './parse.js';
import { detectConflicts, merge, type Conflict } from './conflicts.js';

interface Fingerprint {
  mtime: number;
  size: number;
  hash: string;
}

export interface WatchOptions {
  initial?: Record<string, ParsedData>;
  onUpdate?: (file: string, data: ParsedData) => void;
  onConflict?: (conflict: Conflict) => void;
}

function calcFingerprint(content: string, stat: { mtimeMs: number }): Fingerprint {
  const hash = crypto.createHash('sha1').update(content).digest('hex');
  return { mtime: stat.mtimeMs, size: content.length, hash };
}

export function watchGraph(adapter: FsAdapter, dir: string, opts: WatchOptions = {}): Promise<() => void> {
  const fps = new Map<string, Fingerprint>();
  const parsed = new Map<string, ParsedData>();

  if (opts.initial) {
    for (const [file, data] of Object.entries(opts.initial)) {
      parsed.set(file, data);
      fps.set(file, { mtime: 0, size: 0, hash: '' });
    }
  }

  const handler: WatchHandler = async (evt: WatchEvent, path: string) => {
    if (evt !== 'change') return;
    const file = path;
    const content = await adapter.readFile(file);
    const stat = await adapter.stat(file);
    const fp = calcFingerprint(content, stat);
    const prev = fps.get(file);
    if (prev && prev.mtime === fp.mtime && prev.size === fp.size && prev.hash === fp.hash) {
      return;
    }
    const nextParsed = parseFile(file, content);
    const prevParsed = parsed.get(file);
    if (prevParsed) {
      const conflict = detectConflicts(prevParsed, nextParsed);
      if (conflict) {
        opts.onConflict?.(conflict);
        const merged = merge(prevParsed, nextParsed);
        parsed.set(file, merged);
        fps.set(file, fp);
        opts.onUpdate?.(file, merged);
        return;
      }
    }
    parsed.set(file, nextParsed);
    fps.set(file, fp);
    opts.onUpdate?.(file, nextParsed);
  };

  return adapter.watch(dir, handler);
}
