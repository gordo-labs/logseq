import React, { useState, useCallback, useEffect } from 'react';

interface HeaderProps {
  pageTitle: string | null;
  onSearch: (query: string) => void;
  onGoBack?: () => void;
  onGoForward?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle, onSearch, onGoBack, onGoForward }: HeaderProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.logseq-header-search input') as HTMLInputElement;
        searchInput?.focus();
      }
      // Escape to close search
      if (e.key === 'Escape' && isSearchFocused) {
        setSearchQuery('');
        onSearch('');
        (document.activeElement as HTMLElement)?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchFocused, onSearch]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  }, [onSearch]);

  return (
    <header className="logseq-header">
      <div className="logseq-header-left">
        {onGoBack && (
          <button type="button" className="logseq-header-button" onClick={onGoBack} title="Go back">
            ←
          </button>
        )}
        {onGoForward && (
          <button type="button" className="logseq-header-button" onClick={onGoForward} title="Go forward">
            →
          </button>
        )}
      </div>

      <div className="logseq-header-center">
        <div className="logseq-header-search">
          <input
            type="search"
            placeholder="Search or create page... (⌘K)"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </div>
      </div>

      <div className="logseq-header-right">
        {pageTitle && (
          <div className="logseq-page-title" title={pageTitle}>
            {pageTitle}
          </div>
        )}
      </div>
    </header>
  );
};
