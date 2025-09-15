import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import RNFS from 'react-native-fs';
import { createFileCore } from '@logseq/file-core';
import type { FileCore } from '@logseq/file-core';
import type { Page, SearchResult } from '@logseq/model';
import { ReactNativeFsAdapter } from '@logseq/fs-adapter/rn';
import {
  BlockNode,
  PageSnapshot,
  createBlock,
  insertBlock,
  loadPageSnapshot,
  serializePage
} from '../lib/page';
import { ensureDirExists, fileExists, writeFile } from '../lib/fs';
import { joinPath, sanitizeFileName } from '../lib/path';
import { DebouncedWriter } from '../lib/writeQueue';

export type OperationResult<T> = { ok: true; value: T } | { ok: false; error: string };

interface GraphContextValue {
  root: string;
  setRoot: (value: string) => Promise<OperationResult<void>>;
  loading: boolean;
  error: string | null;
  pages: Page[];
  core: FileCore | null;
  version: number;
  reload: () => Promise<OperationResult<void>>;
  getPageSnapshot: (title: string) => PageSnapshot;
  persistPage: (title: string, nodes: BlockNode[], pagePath?: string | null) => Promise<OperationResult<void>>;
  ensurePage: (title: string) => Promise<OperationResult<Page>>;
  quickCapture: (text: string) => Promise<OperationResult<{ pageTitle: string; blockId: string }>>;
  search: (query: string) => OperationResult<SearchResult>;
}

const GraphContext = createContext<GraphContextValue | undefined>(undefined);

export const DEFAULT_CAPTURE_PAGE = 'Today';
const DEFAULT_ROOT = joinPath(RNFS.DocumentDirectoryPath, 'logseq');

function sortPages(pages: Page[]): Page[] {
  return [...pages].sort((a, b) => a.title.localeCompare(b.title));
}

export const GraphProvider: React.FC<PropsWithChildren> = ({ children }: PropsWithChildren) => {
  const [root, setRootState] = useState<string>(DEFAULT_ROOT);
  const [core, setCore] = useState<FileCore | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const adapterRef = useRef<ReactNativeFsAdapter | null>(null);
  const watcherCleanupRef = useRef<(() => void) | null>(null);
  const writerRef = useRef(new DebouncedWriter(600));
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState ?? 'active');
  const pendingReloadRef = useRef(false);
  const reloadPromiseRef = useRef<Promise<OperationResult<void>> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
      }
      if (watcherCleanupRef.current) {
        watcherCleanupRef.current();
        watcherCleanupRef.current = null;
      }
      const writer = writerRef.current;
      void writer.flushAll().finally(() => {
        writer.dispose();
      });
    };
  }, []);

  const getAdapter = useCallback((): ReactNativeFsAdapter => {
    if (!adapterRef.current) {
      adapterRef.current = new ReactNativeFsAdapter({ pollIntervalMs: 1500 });
    }
    return adapterRef.current;
  }, []);

  const requestReload = useCallback(() => {
    if (appStateRef.current !== 'active') {
      pendingReloadRef.current = true;
      return;
    }
    pendingReloadRef.current = false;
    if (reloadTimerRef.current) {
      clearTimeout(reloadTimerRef.current);
    }
    reloadTimerRef.current = setTimeout(() => {
      reloadTimerRef.current = null;
      void reload();
    }, 400);
  }, []);

  const resolvePagePath = useCallback((title: string, explicitPath?: string | null): string => {
    if (explicitPath) return explicitPath;
    const result = core?.getPageByTitle(title);
    if (result?.ok) {
      return result.value.path;
    }
    const filename = `${sanitizeFileName(title)}.md`;
    return joinPath(root, filename);
  }, [core, root]);

  const reload = useCallback(async (): Promise<OperationResult<void>> => {
    if (!root) {
      return { ok: false, error: 'Graph root is not configured.' };
    }
    if (reloadPromiseRef.current) {
      return reloadPromiseRef.current;
    }
    const task = (async () => {
      if (mountedRef.current) setLoading(true);
      try {
        await ensureDirExists(root);
        const adapter = getAdapter();
        const nextCore = await createFileCore(root, adapter);
        const pagesResult = nextCore.listPages();
        if (!pagesResult.ok) {
          throw pagesResult.error;
        }
        const sorted = sortPages(pagesResult.value);
        if (mountedRef.current) {
          setCore(nextCore);
          setPages(sorted);
          setError(null);
          setVersion(v => v + 1);
        }
        return { ok: true, value: undefined };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (mountedRef.current) {
          setCore(null);
          setPages([]);
          setError(message);
        }
        return { ok: false, error: message };
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    })();
    reloadPromiseRef.current = task;
    const result = await task;
    reloadPromiseRef.current = null;
    return result;
  }, [getAdapter, root]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      appStateRef.current = state;
      if (state !== 'active') {
        void writerRef.current.flushAll();
      } else if (pendingReloadRef.current) {
        pendingReloadRef.current = false;
        requestReload();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [requestReload]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    async function setupWatcher() {
      if (!root) return;
      try {
        const adapter = getAdapter();
        const close = await adapter.watch(root, (_event, filePath) => {
          if (filePath.endsWith('.md')) {
            requestReload();
          }
        });
        if (cancelled) {
          close();
          return;
        }
        watcherCleanupRef.current = () => {
          close();
        };
      } catch (err) {
        console.warn('Failed to watch filesystem', err);
      }
    }
    void setupWatcher();
    return () => {
      cancelled = true;
      if (watcherCleanupRef.current) {
        watcherCleanupRef.current();
        watcherCleanupRef.current = null;
      }
    };
  }, [getAdapter, requestReload, root]);

  const setRoot = useCallback(async (value: string): Promise<OperationResult<void>> => {
    try {
      await writerRef.current.flushAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: message };
    }
    setRootState(value);
    pendingReloadRef.current = false;
    if (reloadTimerRef.current) {
      clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = null;
    }
    return { ok: true, value: undefined };
  }, []);

  const getPageSnapshot = useCallback((title: string): PageSnapshot => {
    return loadPageSnapshot(core, title);
  }, [core]);

  const persistPage = useCallback(async (
    title: string,
    nodes: BlockNode[],
    pagePath?: string | null
  ): Promise<OperationResult<void>> => {
    const targetPath = resolvePagePath(title, pagePath);
    const content = serializePage(title, nodes);
    try {
      await writerRef.current.schedule(targetPath, content);
      requestReload();
      return { ok: true, value: undefined };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: message };
    }
  }, [requestReload, resolvePagePath]);

  const ensurePage = useCallback(async (title: string): Promise<OperationResult<Page>> => {
    const existing = core?.getPageByTitle(title);
    if (existing?.ok) {
      return { ok: true, value: existing.value };
    }
    const targetPath = resolvePagePath(title);
    try {
      if (!(await fileExists(targetPath))) {
        await writeFile(targetPath, `title:: ${title}\n`);
      }
      requestReload();
      return { ok: true, value: { id: title, title, path: targetPath } };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: message };
    }
  }, [core, requestReload, resolvePagePath]);

  const quickCapture = useCallback(async (
    text: string
  ): Promise<OperationResult<{ pageTitle: string; blockId: string }>> => {
    const trimmed = text.trim();
    if (!trimmed) {
      return { ok: false, error: 'Capture text is empty.' };
    }
    if (!core) {
      return { ok: false, error: 'Graph is not loaded yet.' };
    }
    const snapshot = loadPageSnapshot(core, DEFAULT_CAPTURE_PAGE);
    let nodes = snapshot.nodes;
    let pagePath = snapshot.page?.path ?? null;
    if (!snapshot.page) {
      const ensured = await ensurePage(DEFAULT_CAPTURE_PAGE);
      if (!ensured.ok) {
        return { ok: false, error: ensured.error };
      }
      nodes = [];
      pagePath = ensured.value.path;
    }
    const block = createBlock(DEFAULT_CAPTURE_PAGE, trimmed, null);
    const updated = insertBlock(nodes, null, nodes.length, block);
    const result = await persistPage(DEFAULT_CAPTURE_PAGE, updated, pagePath);
    if (!result.ok) {
      return result;
    }
    return { ok: true, value: { pageTitle: DEFAULT_CAPTURE_PAGE, blockId: block.id } };
  }, [core, ensurePage, persistPage]);

  const search = useCallback((query: string): OperationResult<SearchResult> => {
    if (!core) {
      return { ok: false, error: 'Graph is not loaded yet.' };
    }
    const trimmed = query.trim();
    if (!trimmed) {
      return { ok: true, value: { pages: [], blocks: [] } };
    }
    const result = core.search(trimmed);
    if (!result.ok) {
      return { ok: false, error: result.error.message };
    }
    return { ok: true, value: result.value };
  }, [core]);

  const value = useMemo<GraphContextValue>(() => ({
    root,
    setRoot,
    loading,
    error,
    pages,
    core,
    version,
    reload,
    getPageSnapshot,
    persistPage,
    ensurePage,
    quickCapture,
    search
  }), [root, setRoot, loading, error, pages, core, version, reload, getPageSnapshot, persistPage, ensurePage, quickCapture, search]);

  return <GraphContext.Provider value={value}>{children}</GraphContext.Provider>;
};

export function useGraph(): GraphContextValue {
  const ctx = useContext(GraphContext);
  if (!ctx) {
    throw new Error('useGraph must be used within GraphProvider');
  }
  return ctx;
}
