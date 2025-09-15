import React, { useEffect, useMemo, useState } from 'react';
import type { Page } from '@logseq/model';
import { SearchPanel } from './SearchPanel';

interface SidebarProps {
  pages: Page[];
  selectedPage: string | null;
  onSelectPage: (title: string) => void;
  onOpenSettings: () => void;
  todayTitle: string;
  graphRoot: string | null;
}

const PAGE_SIZE = 20;

export const Sidebar: React.FC<SidebarProps> = ({
  pages,
  selectedPage,
  onSelectPage,
  onOpenSettings,
  todayTitle,
  graphRoot
}: SidebarProps) => {
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
  }, [pages]);

  const paginated = useMemo(() => {
    const start = pageIndex * PAGE_SIZE;
    return pages.slice(start, start + PAGE_SIZE);
  }, [pages, pageIndex]);

  const totalPages = Math.max(1, Math.ceil(pages.length / PAGE_SIZE));

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h1>Logseq Desktop</h1>
        <p className="sidebar-graph">{graphRoot ?? 'Select a graph root'}</p>
        <button type="button" className="primary" onClick={() => onSelectPage(todayTitle)}>
          Open Today ({todayTitle})
        </button>
      </header>
      <section className="sidebar-section">
        <SearchPanel onSelectPage={onSelectPage} />
      </section>
      <section className="sidebar-section">
        <div className="sidebar-section-header">
          <h2>Pages</h2>
          <div className="sidebar-pagination">
            <button
              type="button"
              onClick={() => setPageIndex(index => Math.max(0, index - 1))}
              disabled={pageIndex === 0}
            >
              ‹
            </button>
            <span>
              {pageIndex + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPageIndex(index => Math.min(totalPages - 1, index + 1))}
              disabled={pageIndex >= totalPages - 1}
            >
              ›
            </button>
          </div>
        </div>
        <ul className="page-list">
          {paginated.map((page: Page) => (
            <li key={page.id}>
              <button
                type="button"
                className={page.title === selectedPage ? 'page-button active' : 'page-button'}
                onClick={() => onSelectPage(page.title)}
              >
                {page.title}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <footer className="sidebar-footer">
        <button type="button" onClick={onOpenSettings}>
          Settings
        </button>
      </footer>
    </aside>
  );
};
