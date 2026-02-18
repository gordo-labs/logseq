import React, { useState, useCallback, useEffect } from 'react';

interface HeaderProps {
  pageTitle: string | null;
  onSearch: (query: string) => void;
  onGoBack?: () => void;
  onGoForward?: () => void;
  onToggleSidebar?: () => void;
  onToggleRightSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  pageTitle, 
  onSearch, 
  onGoBack, 
  onGoForward,
  onToggleSidebar,
  onToggleRightSidebar
}: HeaderProps) => {
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
      // Cmd/Ctrl + P for search (alternative)
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
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

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // Create new page with search query
      window.dispatchEvent(new CustomEvent('logseq:select-page', { detail: { pageTitle: searchQuery.trim() } }));
      setSearchQuery('');
      onSearch('');
      (e.target as HTMLElement).blur();
    }
  }, [searchQuery, onSearch]);

  return (
    <header className="logseq-header">
      <div className="logseq-header-left">
        {onToggleSidebar && (
          <button 
            type="button" 
            className="logseq-header-button" 
            onClick={onToggleSidebar} 
            title="Toggle sidebar (⌘/)"
          >
            ☰
          </button>
        )}
        <button 
          type="button" 
          className="logseq-header-button" 
          onClick={onGoBack} 
          disabled={!onGoBack}
          title="Go back (⌘[)"
        >
          ←
        </button>
        <button 
          type="button" 
          className="logseq-header-button" 
          onClick={onGoForward}
          disabled={!onGoForward}
          title="Go forward (⌘])"
        >
          →
        </button>
      </div>

      <div className="logseq-header-center">
        <div className="logseq-header-search">
          <input
            type="search"
            placeholder="Search or create page… (⌘K)"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </div>
      </div>

      <div className="logseq-header-right">
        {pageTitle && (
          <div className="logseq-breadcrumb" title={pageTitle}>
            {pageTitle}
          </div>
        )}
        {onToggleRightSidebar && (
          <button 
            type="button" 
            className="logseq-header-button" 
            onClick={onToggleRightSidebar}
            title="Toggle right sidebar"
          >
            ⊞
          </button>
        )}
      </div>
    </header>
  );
};
