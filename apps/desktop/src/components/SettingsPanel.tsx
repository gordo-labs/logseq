import React, { useEffect, useState } from 'react';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { useGraph } from '../state/GraphProvider';

// Dynamically import Tauri API to avoid module load errors
type InvokeFunction = <T = any>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
let invoke: InvokeFunction;

async function initTauriApi() {
  try {
    const tauriApi = await import('@tauri-apps/api');
    if (tauriApi && (tauriApi as any).core && (tauriApi as any).core.invoke) {
      invoke = (tauriApi as any).core.invoke;
      return true;
    }
  } catch (err) {
    console.error('Failed to load Tauri API:', err);
  }
  // Fallback that will throw when called
  invoke = (() => {
    throw new Error('Tauri API not available. Make sure you are running in a Tauri environment.');
  }) as InvokeFunction;
  return false;
}

// Initialize immediately
initTauriApi();
import type { OpsLogEntry } from '../types/system';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ open, onClose }: SettingsPanelProps) => {
  const { root, setRoot, reindex, verify, compact, readHistory } = useGraph();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<OpsLogEntry[]>([]);
  const [foundGraphs, setFoundGraphs] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    readHistory(50).then(entries => setHistory(entries));
    (async () => {
      try {
        if (!invoke || typeof invoke !== 'function') {
          await initTauriApi();
        }
        const graphs = await invoke<string[]>('find_logseq_graphs');
        setFoundGraphs(graphs);
      } catch {
        setFoundGraphs([]);
      }
    })();
  }, [open, readHistory]);

  if (!open) return null;

  const chooseRoot = async () => {
    try {
      const selected = await openDialog({ directory: true, multiple: false });
      if (!selected || Array.isArray(selected)) return;
      setRoot(selected);
      setStatus(`Graph root set to ${selected}`);
      setError(null);
      const entries = await readHistory(50);
      setHistory(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const runAction = async (label: string, action: () => Promise<{ ok: boolean; error?: string }>) => {
    setStatus(`${label}…`);
    setError(null);
    const result = await action();
    if (result.ok) {
      setStatus(`${label} complete`);
      const entries = await readHistory(50);
      setHistory(entries);
    } else {
      setStatus(null);
      setError(result.error ?? 'Unknown error');
    }
  };

  return (
    <div className="settings-panel">
      <div className="settings-content">
        <header>
          <h2>Settings</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <section>
          <h3>Graph root</h3>
          <p className="settings-path">{root ?? 'No graph selected'}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {foundGraphs.length > 0 && (
              <div>
                <p style={{ fontSize: '0.85rem', marginBottom: '8px' }}>Found Logseq graphs:</p>
                {foundGraphs.map((graphPath) => (
                  <button
                    key={graphPath}
                    type="button"
                    onClick={() => {
                      setRoot(graphPath);
                      setStatus(`Graph root set to ${graphPath}`);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 8px',
                      marginBottom: '4px',
                      background: graphPath === root ? 'rgba(99, 102, 241, 0.2)' : 'rgba(148, 163, 184, 0.1)',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      wordBreak: 'break-all'
                    }}
                  >
                    {graphPath}
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={chooseRoot}>
              Choose folder…
            </button>
          </div>
        </section>
        <section>
          <h3>Maintenance</h3>
          <div className="settings-actions">
            <button type="button" onClick={() => runAction('Reindex', reindex)}>
              Reindex
            </button>
            <button type="button" onClick={() => runAction('Verify', verify)}>
              Verify
            </button>
            <button type="button" onClick={() => runAction('Compact', compact)}>
              Compact
            </button>
          </div>
        </section>
        <section>
          <h3>History</h3>
          {history.length === 0 ? (
            <p>No recorded transactions yet.</p>
          ) : (
            <ul className="history-list">
              {history.map((entry: OpsLogEntry) => (
                <li key={entry.id}>
                  <strong>{new Date(entry.timestamp).toLocaleString()}</strong>
                  <span>{entry.transactionId}</span>
                  <span>{entry.operations.length} operations</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        {status && <p className="status">{status}</p>}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
};
