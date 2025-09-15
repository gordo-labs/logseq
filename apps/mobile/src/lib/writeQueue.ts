import { writeFile } from './fs';

interface PendingEntry {
  path: string;
  content: string;
  timer: ReturnType<typeof setTimeout> | null;
  resolve: () => void;
  reject: (error: Error) => void;
  promise: Promise<void>;
}

export class DebouncedWriter {
  private readonly delayMs: number;
  private readonly entries = new Map<string, PendingEntry>();

  constructor(delayMs = 500) {
    this.delayMs = delayMs;
  }

  schedule(path: string, content: string): Promise<void> {
    const existing = this.entries.get(path);
    if (existing) {
      existing.content = content;
      if (existing.timer) {
        clearTimeout(existing.timer);
      }
      existing.timer = this.createTimer(existing);
      return existing.promise;
    }
    const entry: PendingEntry = this.createEntry(path, content);
    this.entries.set(path, entry);
    entry.timer = this.createTimer(entry);
    return entry.promise;
  }

  async flushAll(): Promise<void> {
    const pending = Array.from(this.entries.values());
    this.entries.clear();
    await Promise.all(pending.map(entry => this.writeNow(entry)));
  }

  dispose(): void {
    for (const entry of this.entries.values()) {
      if (entry.timer) {
        clearTimeout(entry.timer);
      }
      entry.reject(new Error('Writer disposed'));
    }
    this.entries.clear();
  }

  private createEntry(path: string, content: string): PendingEntry {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return {
      path,
      content,
      timer: null,
      resolve,
      reject,
      promise
    };
  }

  private createTimer(entry: PendingEntry): ReturnType<typeof setTimeout> {
    return setTimeout(() => {
      void this.writeNow(entry);
    }, this.delayMs);
  }

  private async writeNow(entry: PendingEntry): Promise<void> {
    try {
      const current = this.entries.get(entry.path);
      if (current === entry) {
        this.entries.delete(entry.path);
      }
      if (entry.timer) {
        clearTimeout(entry.timer);
        entry.timer = null;
      }
      await writeFile(entry.path, entry.content);
      entry.resolve();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      entry.reject(error);
    }
  }
}
