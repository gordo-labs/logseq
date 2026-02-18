import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createFileCoreLazy, createFileCore } from '@logseq/file-core';
import type { FileCore, LazyFileCore } from '@logseq/file-core';
import type { Page } from '@logseq/model';
import * as tauriApi from '@tauri-apps/api';

// Tauri API invoke function
type InvokeFunction = <T = any>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
let invoke: InvokeFunction | null = null;
let tauriAvailable = false;

// Check if we're running inside Tauri
function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function initTauriApi(): boolean {
  if (!isTauriEnvironment()) {
    console.info('Running in browser mode - Tauri API not available');
    return false;
  }
  
  try {
    if (tauriApi && tauriApi.core && tauriApi.core.invoke) {
      invoke = tauriApi.core.invoke;
      tauriAvailable = true;
      return true;
    }
  } catch (err) {
    console.warn('Failed to initialize Tauri API:', err);
  }
  
  return false;
}

// Initialize synchronously
initTauriApi();
import { TauriFsAdapter } from '../lib/TauriFsAdapter';
import type { Transaction } from '../types/transaction';
import type { ActionResult, OpsLogEntry } from '../types/system';

interface GraphContextValue {
  root: string | null;
  setRoot: (root: string | null) => void;
  core: FileCore | null;
  pages: Page[];
  loading: boolean;
  indexing: boolean;
  error: string | null;
  reload: () => Promise<void>;
  applyTransaction: (tx: Transaction) => Promise<ActionResult>;
  reindex: () => Promise<ActionResult>;
  verify: () => Promise<ActionResult>;
  compact: () => Promise<ActionResult>;
  readHistory: (limit?: number) => Promise<OpsLogEntry[]>;
  loadPage: (title: string) => Promise<void>;
}

const GraphContext = React.createContext<GraphContextValue | undefined>(undefined);

const STORAGE_KEY = 'logseq.desktop.graphRoot';
const CACHE_KEY_PREFIX = 'logseq.desktop.cache.';
const CACHE_VERSION = 1;
const LAST_GRAPH_KEY = 'logseq.desktop.lastGraph';

interface PageCache {
  version: number;
  pages: Page[];
  timestamp: number;
}

function getCacheKey(root: string): string {
  return `${CACHE_KEY_PREFIX}${root}`;
}

function loadCachedPages(root: string): Page[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = window.localStorage.getItem(getCacheKey(root));
    if (!cached) return null;
    const data: PageCache = JSON.parse(cached);
    if (data.version !== CACHE_VERSION) return null;
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) return null;
    return data.pages;
  } catch {
    return null;
  }
}

function saveCachedPages(root: string, pages: Page[]): void {
  if (typeof window === 'undefined') return;
  try {
    const data: PageCache = {
      version: CACHE_VERSION,
      pages,
      timestamp: Date.now()
    };
    window.localStorage.setItem(getCacheKey(root), JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

function sortPages(pages: Page[]): Page[] {
  return [...pages].sort((a, b) => a.title.localeCompare(b.title));
}

export const GraphProvider: React.FC<{ children?: React.ReactNode }> = ({ children }: { children?: React.ReactNode }) => {
  const [root, setRootState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    const lastGraph = window.localStorage.getItem(LAST_GRAPH_KEY);
    return lastGraph;
  });
  const [core, setCore] = useState<FileCore | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const adapterRef = useRef<TauriFsAdapter | null>(null);

  const loadGraphLazy = useCallback(async (graphRoot: string): Promise<{ core: FileCore; pages: Page[] }> => {
    const adapter = adapterRef.current ?? new TauriFsAdapter();
    adapterRef.current = adapter;
    const nextCore = await createFileCoreLazy(graphRoot, adapter);
    const pagesResult = nextCore.listPages();
    if (!pagesResult.ok) {
      throw pagesResult.error;
    }
    return { core: nextCore, pages: sortPages(pagesResult.value) };
  }, []);

  const loadGraph = useCallback(async (graphRoot: string): Promise<{ core: FileCore; pages: Page[] }> => {
    const adapter = adapterRef.current ?? new TauriFsAdapter();
    adapterRef.current = adapter;
    const nextCore = await createFileCore(graphRoot, adapter);
    const pagesResult = nextCore.listPages();
    if (!pagesResult.ok) {
      throw pagesResult.error;
    }
    return { core: nextCore, pages: sortPages(pagesResult.value) };
  }, []);

  useEffect(() => {
    let cancelled = false;
    
    const autoDetectGraph = async () => {
      if (root) return;
      
      if (!tauriAvailable || !invoke) {
        // Not in Tauri environment - this is fine for browser development
        return;
      }
      
      try {
        const graphs = await invoke<string[]>('find_logseq_graphs');
        if (graphs.length > 0 && !cancelled) {
          const firstGraph = graphs[0];
          setRootState(firstGraph);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEY, firstGraph);
            window.localStorage.setItem(LAST_GRAPH_KEY, firstGraph);
          }
        }
      } catch (err) {
        console.error('Failed to auto-detect graphs:', err);
      }
    };
    
    void autoDetectGraph();
  }, []);
  
  useEffect(() => {
    let cancelled = false;
    if (!root) {
      setCore(null);
      setPages([]);
      setLoading(false);
      setIndexing(false);
      setError(null);
      return;
    }
    
    setError(null);
    
    const cachedPages = loadCachedPages(root);
    if (cachedPages) {
      setPages(cachedPages);
    }
    
    setIndexing(true);
    
    loadGraphLazy(root)
      .then(data => {
        if (cancelled) return;
        setCore(data.core);
        setPages(data.pages);
        saveCachedPages(root, data.pages);
        setIndexing(false);
      })
      .catch(err => {
        if (cancelled) return;
        setCore(null);
        if (!cachedPages) {
          setPages([]);
        }
        setIndexing(false);
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [root, loadGraphLazy]);

  const setRoot = useCallback((value: string | null) => {
    setRootState(value);
    if (typeof window !== 'undefined') {
      if (value) {
        window.localStorage.setItem(STORAGE_KEY, value);
        window.localStorage.setItem(LAST_GRAPH_KEY, value);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(LAST_GRAPH_KEY);
      }
    }
  }, []);

  const reload = useCallback(async () => {
    if (!root) return;
    setLoading(true);
    setError(null);
    try {
      const data = await loadGraph(root);
      setCore(data.core);
      setPages(data.pages);
    } catch (err) {
      setCore(null);
      setPages([]);
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [root, loadGraph]);

  const loadPage = useCallback(async (title: string): Promise<void> => {
    if (!core) return;
    if ('loadPageOnDemand' in core) {
      await (core as LazyFileCore).loadPageOnDemand(title);
    }
  }, [core]);

  const guardRoot = useCallback(() => {
    if (!root) {
      return { ok: false, error: 'Graph root is not configured.' } as ActionResult;
    }
    return { ok: true } as ActionResult;
  }, [root]);

  const applyTransaction = useCallback(async (tx: Transaction): Promise<ActionResult> => {
    const guard = guardRoot();
    if (!guard.ok) return guard;
    
    if (!tauriAvailable || !invoke) {
      return { ok: false, error: 'Tauri API not available. Run this app in the Tauri desktop environment.' };
    }
    
    try {
      await invoke('apply_transaction', { root, tx });
      await reload();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }, [guardRoot, reload, root]);

  const reindex = useCallback(async (): Promise<ActionResult> => {
    const guard = guardRoot();
    if (!guard.ok) return guard;
    
    if (!tauriAvailable || !invoke) {
      return { ok: false, error: 'Tauri API not available.' };
    }
    
    try {
      await invoke('reindex_graph', { root });
      await reload();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }, [guardRoot, reload, root]);

  const verify = useCallback(async (): Promise<ActionResult> => {
    const guard = guardRoot();
    if (!guard.ok) return guard;
    
    if (!tauriAvailable || !invoke) {
      return { ok: false, error: 'Tauri API not available.' };
    }
    
    try {
      await invoke('verify_graph', { root });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }, [guardRoot, root]);

  const compact = useCallback(async (): Promise<ActionResult> => {
    const guard = guardRoot();
    if (!guard.ok) return guard;
    
    if (!tauriAvailable || !invoke) {
      return { ok: false, error: 'Tauri API not available.' };
    }
    
    try {
      await invoke('compact_graph', { root });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }, [guardRoot, root]);

  const readHistory = useCallback(async (limit = 100): Promise<OpsLogEntry[]> => {
    if (!root) return [];
    
    if (!tauriAvailable || !invoke) {
      return [];
    }
    
    try {
      const entries = await invoke<OpsLogEntry[]>('read_ops_log', { root, limit });
      return entries;
    } catch (err) {
      console.error('Failed to read ops log', err);
      return [];
    }
  }, [root]);

  const value = useMemo<GraphContextValue>(() => ({
    root,
    setRoot,
    core,
    pages,
    loading,
    indexing,
    error,
    reload,
    applyTransaction,
    reindex,
    verify,
    compact,
    readHistory,
    loadPage
  }), [root, setRoot, core, pages, loading, indexing, error, reload, applyTransaction, reindex, verify, compact, readHistory, loadPage]);

  return <GraphContext.Provider value={value}>{children}</GraphContext.Provider>;
};

export function useGraph(): GraphContextValue {
  const ctx = useContext(GraphContext);
  if (!ctx) throw new Error('useGraph must be used within GraphProvider');
  return ctx;
}
