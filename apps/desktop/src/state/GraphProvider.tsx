import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createFileCore } from '@logseq/file-core';
import type { FileCore } from '@logseq/file-core';
import type { Page } from '@logseq/model';
import { invoke } from '@tauri-apps/api/tauri';
import { TauriFsAdapter } from '../lib/TauriFsAdapter';
import type { Transaction } from '../types/transaction';
import type { ActionResult, OpsLogEntry } from '../types/system';

interface GraphContextValue {
  root: string | null;
  setRoot: (root: string | null) => void;
  core: FileCore | null;
  pages: Page[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  applyTransaction: (tx: Transaction) => Promise<ActionResult>;
  reindex: () => Promise<ActionResult>;
  verify: () => Promise<ActionResult>;
  compact: () => Promise<ActionResult>;
  readHistory: (limit?: number) => Promise<OpsLogEntry[]>;
}

const GraphContext = React.createContext<GraphContextValue | undefined>(undefined);

const STORAGE_KEY = 'logseq.desktop.graphRoot';

function sortPages(pages: Page[]): Page[] {
  return [...pages].sort((a, b) => a.title.localeCompare(b.title));
}

export const GraphProvider: React.FC<{ children?: React.ReactNode }> = ({ children }: { children?: React.ReactNode }) => {
  const [root, setRootState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(STORAGE_KEY);
  });
  const [core, setCore] = useState<FileCore | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const adapterRef = useRef<TauriFsAdapter | null>(null);

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
    if (!root) {
      setCore(null);
      setPages([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    loadGraph(root)
      .then(data => {
        if (cancelled) return;
        setCore(data.core);
        setPages(data.pages);
      })
      .catch(err => {
        if (cancelled) return;
        setCore(null);
        setPages([]);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [root, loadGraph]);

  const setRoot = useCallback((value: string | null) => {
    setRootState(value);
    if (typeof window !== 'undefined') {
      if (value) {
        window.localStorage.setItem(STORAGE_KEY, value);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
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

  const guardRoot = useCallback(() => {
    if (!root) {
      return { ok: false, error: 'Graph root is not configured.' } as ActionResult;
    }
    return { ok: true } as ActionResult;
  }, [root]);

  const applyTransaction = useCallback(async (tx: Transaction): Promise<ActionResult> => {
    const guard = guardRoot();
    if (!guard.ok) return guard;
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
    try {
      await invoke('compact_graph', { root });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }, [guardRoot, root]);

  const readHistory = useCallback(async (limit = 100): Promise<OpsLogEntry[]> => {
    if (!root) return [];
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
    error,
    reload,
    applyTransaction,
    reindex,
    verify,
    compact,
    readHistory
  }), [root, setRoot, core, pages, loading, error, reload, applyTransaction, reindex, verify, compact, readHistory]);

  return <GraphContext.Provider value={value}>{children}</GraphContext.Provider>;
};

export function useGraph(): GraphContextValue {
  const ctx = useContext(GraphContext);
  if (!ctx) throw new Error('useGraph must be used within GraphProvider');
  return ctx;
}
