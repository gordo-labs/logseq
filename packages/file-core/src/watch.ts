import type { FsAdapter, WatchHandler } from '@logseq/fs-adapter';

export function watchGraph(adapter: FsAdapter, dir: string, handler: WatchHandler) {
  return adapter.watch(dir, handler);
}
