export type WatchEvent = 'add' | 'change' | 'unlink';
export type WatchHandler = (event: WatchEvent, path: string) => void;

export interface FileStats {
  mtimeMs: number;
}

export interface FsAdapter {
  listFiles(dir: string): Promise<string[]>;
  readFile(path: string): Promise<string>;
  stat(path: string): Promise<FileStats>;
  watch(dir: string, handler: WatchHandler): Promise<() => void>;
}
