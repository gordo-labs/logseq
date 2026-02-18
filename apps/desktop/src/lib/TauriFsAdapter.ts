import type { FsAdapter, FileStats, WatchHandler } from '@logseq/fs-adapter';
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

export class TauriFsAdapter implements FsAdapter {
  private ensureInvoke(): void {
    if (!tauriAvailable || !invoke) {
      throw new Error('Tauri API not available. Run this app in the Tauri desktop environment.');
    }
  }

  async listFiles(dir: string): Promise<string[]> {
    this.ensureInvoke();
    return await invoke!<string[]>('list_files', { root: dir });
  }

  async readFile(path: string): Promise<string> {
    this.ensureInvoke();
    return await invoke!<string>('read_file', { path });
  }

  async stat(path: string): Promise<FileStats> {
    this.ensureInvoke();
    return await invoke!<FileStats>('stat_file', { path });
  }

  async watch(_dir: string, _handler: WatchHandler): Promise<() => void> {
    console.warn('File watching is not yet implemented for the desktop client.');
    return () => {};
  }
}
