export type WatchEvent = {
  type: 'add' | 'change' | 'unlink';
  path: string;
};

export type WatchHandler = (event: WatchEvent) => void | Promise<void>;

export interface FileStats {
  mtimeMs: number;
}

export interface FsAdapter {
  listFiles(dir: string): Promise<string[]>;
  readFile(path: string): Promise<string>;
  stat(path: string): Promise<FileStats>;
  watch(dir: string, handler: WatchHandler): Promise<() => void>;
}

export type Watcher = Promise<() => void>;
