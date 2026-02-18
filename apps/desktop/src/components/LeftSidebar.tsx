import React, { useMemo, useState } from 'react';
import type { Page } from '@logseq/model';
import { SearchPanel } from './SearchPanel';
import { getTodayJournalTitle } from '../lib/dates';

interface LeftSidebarProps {
  pages: Page[];
  selectedPage: string | null;
  onSelectPage: (title: string) => void;
  onOpenSettings: () => void;
  todayTitle: string;
  graphRoot: string | null;
}

const PAGE_SIZE = 50;

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  pages,
  selectedPage,
  onSelectPage,
  onOpenSettings,
  todayTitle,
  graphRoot
}: LeftSidebarProps) => {
  const [activeTab, setActiveTab] = useState<'today' | 'all' | 'recent' | 'favorites'>('today');
  const [pageIndex, setPageIndex] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('logseq-favorites');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [recentPages, setRecentPages] = useState<string[]>(() => {
    const stored = localStorage.getItem('logseq-recent');
    return stored ? JSON.parse(stored) : [];
  });

  // Update recent pages when a page is selected
  React.useEffect(() => {
    if (selectedPage) {
      setRecentPages(prev => {
        const updated = [selectedPage, ...prev.filter(p => p !== selectedPage)].slice(0, 20);
        localStorage.setItem('logseq-recent', JSON.stringify(updated));
        return updated;
      });
    }
  }, [selectedPage]);

  const toggleFavorite = (pageTitle: string) => {
    setFavorites(prev => {
      const updated = new Set(prev);
      if (updated.has(pageTitle)) {
        updated.delete(pageTitle);
      } else {
        updated.add(pageTitle);
      }
      localStorage.setItem('logseq-favorites', JSON.stringify(Array.from(updated)));
      return updated;
    });
  };

  const paginatedPages = useMemo(() => {
    const start = pageIndex * PAGE_SIZE;
    return pages.slice(start, start + PAGE_SIZE);
  }, [pages, pageIndex]);

  const totalPages = Math.max(1, Math.ceil(pages.length / PAGE_SIZE));

  const favoritePages = useMemo(() => {
    return pages.filter(p => favorites.has(p.title));
  }, [pages, favorites]);

  const recentPagesList = useMemo(() => {
    return recentPages
      .map(title => pages.find(p => p.title === title))
      .filter((p): p is Page => p !== undefined);
  }, [recentPages, pages]);

  const renderPageList = (pageList: Page[]) => (
    <ul className="logseq-page-list">
      {pageList.length === 0 ? (
        <li className="logseq-empty-state">No pages</li>
      ) : (
        pageList.map((page: Page) => (
          <li key={page.id} className="logseq-page-item">
            <button
              type="button"
              className={`logseq-page-button ${page.title === selectedPage ? 'active' : ''}`}
              onClick={() => onSelectPage(page.title)}
              title={page.title}
            >
              <span className="logseq-page-title">{page.title}</span>
            </button>
            <button
              type="button"
              className={`logseq-favorite-button ${favorites.has(page.title) ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(page.title);
              }}
              title={favorites.has(page.title) ? 'Remove from favorites' : 'Add to favorites'}
            >
              {favorites.has(page.title) ? '★' : '☆'}
            </button>
          </li>
        ))
      )}
    </ul>
  );

  return (
    <aside className="logseq-left-sidebar">
      <div className="logseq-sidebar-header">
        <div className="logseq-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Logseq</span>
        </div>
        {graphRoot && (
          <div className="logseq-graph-name" title={graphRoot}>
            {graphRoot.split('/').pop() || graphRoot}
          </div>
        )}
      </div>

      <div className="logseq-sidebar-search">
        <SearchPanel onSelectPage={onSelectPage} />
      </div>

      <div className="logseq-sidebar-tabs">
        <button
          type="button"
          className={`logseq-tab ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          📅 Today
        </button>
        <button
          type="button"
          className={`logseq-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          📄 All Pages
        </button>
        <button
          type="button"
          className={`logseq-tab ${activeTab === 'recent' ? 'active' : ''}`}
          onClick={() => setActiveTab('recent')}
        >
          🕐 Recent
        </button>
        <button
          type="button"
          className={`logseq-tab ${activeTab === 'favorites' ? 'active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          ⭐ Favorites
        </button>
      </div>

      <div className="logseq-sidebar-content">
        {activeTab === 'today' && (
          <div className="logseq-tab-content">
            <button
              type="button"
              className="logseq-today-button"
              onClick={() => onSelectPage(todayTitle)}
            >
              <span className="logseq-today-icon">📅</span>
              <div>
                <div className="logseq-today-label">Today</div>
                <div className="logseq-today-date">{todayTitle}</div>
              </div>
            </button>
          </div>
        )}

        {activeTab === 'all' && (
          <div className="logseq-tab-content">
            <div className="logseq-section-header">
              <span>All Pages ({pages.length})</span>
              {totalPages > 1 && (
                <div className="logseq-pagination">
                  <button
                    type="button"
                    onClick={() => setPageIndex(i => Math.max(0, i - 1))}
                    disabled={pageIndex === 0}
                  >
                    ‹
                  </button>
                  <span>{pageIndex + 1} / {totalPages}</span>
                  <button
                    type="button"
                    onClick={() => setPageIndex(i => Math.min(totalPages - 1, i + 1))}
                    disabled={pageIndex >= totalPages - 1}
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
            {renderPageList(paginatedPages)}
          </div>
        )}

        {activeTab === 'recent' && (
          <div className="logseq-tab-content">
            <div className="logseq-section-header">
              <span>Recent Pages</span>
            </div>
            {renderPageList(recentPagesList)}
          </div>
        )}

        {activeTab === 'favorites' && (
          <div className="logseq-tab-content">
            <div className="logseq-section-header">
              <span>Favorites ({favoritePages.length})</span>
            </div>
            {renderPageList(favoritePages)}
          </div>
        )}
      </div>

      <div className="logseq-sidebar-footer">
        <button type="button" className="logseq-settings-button" onClick={onOpenSettings}>
          ⚙️ Settings
        </button>
      </div>
    </aside>
  );
};
