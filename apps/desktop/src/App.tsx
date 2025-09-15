import React, { useEffect, useMemo, useState } from 'react';
import { GraphProvider, useGraph } from './state/GraphProvider';
import { Sidebar } from './components/Sidebar';
import { PageView } from './components/PageView';
import { BacklinksPanel } from './components/BacklinksPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { getTodayJournalTitle } from './lib/dates';

const GraphShell: React.FC = () => {
  const { root, pages, loading, error } = useGraph();
  const todayTitle = useMemo(() => getTodayJournalTitle(), []);
  const [selectedPage, setSelectedPage] = useState<string>(todayTitle);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [backlinksOpen, setBacklinksOpen] = useState(false);

  useEffect(() => {
    setSelectedPage(todayTitle);
  }, [todayTitle, root]);

  const handleSelectPage = (title: string) => {
    setSelectedPage(title);
    setBacklinksOpen(false);
  };

  return (
    <div className="app-shell">
      <Sidebar
        pages={pages}
        selectedPage={selectedPage}
        onSelectPage={handleSelectPage}
        onOpenSettings={() => setSettingsOpen(true)}
        todayTitle={todayTitle}
        graphRoot={root}
      />
      <main className="main">
        {!root ? (
          <div className="empty-state">
            <p>Select a graph root to get started.</p>
            <button type="button" onClick={() => setSettingsOpen(true)}>
              Choose graph directory
            </button>
          </div>
        ) : loading ? (
          <div className="empty-state">Loading graph…</div>
        ) : (
          <PageView pageTitle={selectedPage} onRequestBacklinks={() => setBacklinksOpen(true)} />
        )}
        {error && <p className="error banner">{error}</p>}
      </main>
      <BacklinksPanel
        pageTitle={selectedPage}
        open={backlinksOpen}
        onClose={() => setBacklinksOpen(false)}
        onSelectPage={handleSelectPage}
      />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

const App: React.FC = () => (
  <GraphProvider>
    <GraphShell />
  </GraphProvider>
);

export default App;
