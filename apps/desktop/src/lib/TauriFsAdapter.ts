import { invoke } from '@tauri-apps/api/tauri';
import type { FsAdapter, FileStats, WatchHandler } from '@logseq/fs-adapter';

export class TauriFsAdapter implements FsAdapter {
  async listFiles(dir: string): Promise<string[]> {
    return await invoke<string[]>('list_files', { root: dir });
  }

  async readFile(path: string): Promise<string> {
    return await invoke<string>('read_file', { path });
  }

  async stat(path: string): Promise<FileStats> {
    return await invoke<FileStats>('stat_file', { path });
  }

  async watch(_dir: string, _handler: WatchHandler): Promise<() => void> {
    console.warn('File watching is not yet implemented for the desktop client.');
    return () => {};
  }
}
