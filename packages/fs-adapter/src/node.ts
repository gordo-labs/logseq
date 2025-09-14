import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { FsAdapter, WatchHandler, FileStats, WatchEvent } from './types.js';

export class NodeFsAdapter implements FsAdapter {
  async listFiles(dir: string): Promise<string[]> {
    const entries = await fsp.readdir(dir);
    return entries.map(e => path.join(dir, e));
  }

  async readFile(filePath: string): Promise<string> {
    return await fsp.readFile(filePath, 'utf8');
  }

  async stat(filePath: string): Promise<FileStats> {
    const s = await fsp.stat(filePath);
    return { mtimeMs: s.mtimeMs };
  }

  async watch(dir: string, handler: WatchHandler): Promise<() => void> {
    const watcher = fs.watch(dir, (event, filename) => {
      if (!filename) return;
      const evt: WatchEvent = event === 'rename' ? 'change' : event;
      handler(evt, path.join(dir, filename.toString()));
    });
    return () => watcher.close();
  }
}

export default NodeFsAdapter;
export type { FsAdapter, WatchHandler } from './types.js';
