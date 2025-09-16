import { AppState, AppStateStatus, NativeEventSubscription } from 'react-native';
import RNFS, { ReadDirItem, StatResult } from 'react-native-fs';
import type { FsAdapter, WatchHandler, FileStats } from './types.js';

interface ReactNativeFsAdapterOptions {
  pollIntervalMs?: number;
}

interface TrackedFile {
  mtimeMs: number;
  size: number;
}

function toMtimeMs(value: Date | string | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return value.getTime();
}

function isMarkdownFile(entry: ReadDirItem): boolean {
  return entry.isFile() && entry.path.toLowerCase().endsWith('.md');
}

class DirectoryWatcher {
  private readonly dir: string;
  private readonly handler: WatchHandler;
  private readonly pollIntervalMs: number;
  private readonly files = new Map<string, TrackedFile>();
  private subscription: NativeEventSubscription | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private disposed = false;
  private polling = false;
  private appState: AppStateStatus = AppState.currentState ?? 'active';
  private initialized = false;

  constructor(dir: string, handler: WatchHandler, pollIntervalMs: number) {
    this.dir = dir;
    this.handler = handler;
    this.pollIntervalMs = pollIntervalMs;
  }

  async start(): Promise<void> {
    this.subscription = AppState.addEventListener('change', state => {
      this.appState = state;
      if (state === 'active') {
        this.ensureTimer();
        void this.poll();
      } else {
        this.stopTimer();
      }
    });
    await this.poll();
    this.ensureTimer();
    this.initialized = true;
  }

  close(): void {
    this.disposed = true;
    this.stopTimer();
    this.subscription?.remove();
    this.subscription = null;
    this.initialized = false;
    this.files.clear();
  }

  private ensureTimer(): void {
    if (this.disposed) return;
    if (this.appState !== 'active') {
      this.stopTimer();
      return;
    }
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.poll();
    }, this.pollIntervalMs);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async poll(): Promise<void> {
    if (this.polling || this.disposed) return;
    this.polling = true;
    try {
      const entries = await RNFS.readDir(this.dir);
      const seen = new Set<string>();
      for (const entry of entries) {
        if (!isMarkdownFile(entry)) continue;
        const fingerprint: TrackedFile = {
          mtimeMs: toMtimeMs(entry.mtime),
          size: entry.size
        };
        const filePath = entry.path;
        seen.add(filePath);
        const previous = this.files.get(filePath);
        if (!previous) {
          this.files.set(filePath, fingerprint);
          if (this.initialized) {
            this.handler('add', filePath);
          }
        } else if (previous.mtimeMs !== fingerprint.mtimeMs || previous.size !== fingerprint.size) {
          this.files.set(filePath, fingerprint);
          this.handler('change', filePath);
        }
      }
      for (const filePath of Array.from(this.files.keys())) {
        if (!seen.has(filePath)) {
          this.files.delete(filePath);
          if (this.initialized) {
            this.handler('unlink', filePath);
          }
        }
      }
    } catch (err) {
      console.warn('[ReactNativeFsAdapter] Failed to poll directory', err);
    } finally {
      this.polling = false;
    }
  }
}

export class ReactNativeFsAdapter implements FsAdapter {
  private readonly pollIntervalMs: number;
  private readonly watchers = new Set<DirectoryWatcher>();

  constructor(options: ReactNativeFsAdapterOptions = {}) {
    this.pollIntervalMs = options.pollIntervalMs ?? 2000;
  }

  async listFiles(dir: string): Promise<string[]> {
    const entries = await RNFS.readDir(dir);
    return entries.filter(item => item.isFile()).map(item => item.path);
  }

  async readFile(filePath: string): Promise<string> {
    return RNFS.readFile(filePath, 'utf8');
  }

  async stat(filePath: string): Promise<FileStats> {
    const stat: StatResult = await RNFS.stat(filePath);
    return { mtimeMs: toMtimeMs(stat.mtime) };
  }

  async watch(dir: string, handler: WatchHandler): Promise<() => void> {
    const watcher = new DirectoryWatcher(dir, handler, this.pollIntervalMs);
    await watcher.start();
    this.watchers.add(watcher);
    return () => {
      watcher.close();
      this.watchers.delete(watcher);
    };
  }
}

export default ReactNativeFsAdapter;
export type { FsAdapter, WatchEvent, WatchHandler } from './types.js';
