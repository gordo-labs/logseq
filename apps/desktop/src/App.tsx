import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GraphProvider, useGraph } from './state/GraphProvider';
import { LeftSidebar } from './components/LeftSidebar';
import { Header } from './components/Header';
import { PageView } from './components/PageView';
import { BacklinksPanel } from './components/BacklinksPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { getTodayJournalTitle } from './lib/dates';

const GraphShell: React.FC = () => {
  const { root, pages, loading, indexing, error } = useGraph();
  const todayTitle = useMemo(() => getTodayJournalTitle(), []);
  const [selectedPage, setSelectedPage] = useState<string>(todayTitle);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [backlinksOpen, setBacklinksOpen] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    setSelectedPage(todayTitle);
  }, [todayTitle, root]);

  const handleSelectPage = useCallback((title: string) => {
    setSelectedPage(title);
    // Add to history
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      if (newHistory[newHistory.length - 1] !== title) {
        newHistory.push(title);
      }
      return newHistory.slice(-50); // Keep last 50
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Listen for page selection events from block references
  useEffect(() => {
    const handlePageSelect = (e: CustomEvent<{ pageTitle: string }>) => {
      handleSelectPage(e.detail.pageTitle);
    };
    window.addEventListener('logseq:select-page', handlePageSelect as EventListener);
    return () => window.removeEventListener('logseq:select-page', handlePageSelect as EventListener);
  }, [handleSelectPage]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac') || navigator.userAgent.includes('Mac');
      const metaKey = isMac ? e.metaKey : e.ctrlKey;
      
      // Toggle left sidebar
      if (metaKey && e.key === '/') {
        e.preventDefault();
        setLeftSidebarOpen(prev => !prev);
      }
      // Toggle right sidebar (backlinks)
      if (metaKey && e.key === '\\') {
        e.preventDefault();
        setBacklinksOpen(prev => !prev);
      }
      // Navigate back
      if (metaKey && e.key === '[') {
        e.preventDefault();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setSelectedPage(history[newIndex]);
        }
      }
      // Navigate forward
      if (metaKey && e.key === ']') {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          setSelectedPage(history[newIndex]);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleGoBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setSelectedPage(history[newIndex]);
    }
  };

  const handleGoForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setSelectedPage(history[newIndex]);
    }
  };

  const handleToggleSidebar = () => {
    setLeftSidebarOpen(prev => !prev);
  };

  const handleToggleRightSidebar = () => {
    setBacklinksOpen(prev => !prev);
  };

  return (
    <div className="logseq-app" style={{ minHeight: '100vh', display: 'flex' }}>
      {leftSidebarOpen && (
        <LeftSidebar
          pages={pages}
          selectedPage={selectedPage}
          onSelectPage={handleSelectPage}
          onOpenSettings={() => setSettingsOpen(true)}
          todayTitle={todayTitle}
          graphRoot={root}
        />
      )}
      <div className="logseq-main-container">
        <Header
          pageTitle={selectedPage}
          onSearch={handleSearch}
          onGoBack={historyIndex > 0 ? handleGoBack : undefined}
          onGoForward={historyIndex < history.length - 1 ? handleGoForward : undefined}
          onToggleSidebar={handleToggleSidebar}
          onToggleRightSidebar={handleToggleRightSidebar}
        />
        <main className="logseq-main-content">
          {!root ? (
            <div className="logseq-empty-state">
              <p>Detecting Logseq graphs…</p>
              <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '8px' }}>
                If no graph is found, click Settings to choose a folder.
              </p>
              <button type="button" className="logseq-button-primary" onClick={() => setSettingsOpen(true)}>
                Choose graph directory
              </button>
            </div>
          ) : (
            <>
              {indexing && (
                <div className="logseq-indexing-indicator">
                  Indexing graph… ({pages.length} pages found)
                </div>
              )}
              <PageView pageTitle={selectedPage} onRequestBacklinks={() => setBacklinksOpen(true)} />
            </>
          )}
          {error && <div className="logseq-error-banner">{error}</div>}
        </main>
      </div>
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

const App: React.FC = () => {
  return (
    <GraphProvider>
      <GraphShell />
    </GraphProvider>
  );
};

export default App;
