import React, { useEffect, useState } from 'react';
import type { Block, Page, SearchResult } from '@logseq/model';
import { useGraph } from '../state/GraphProvider';

interface SearchPanelProps {
  onSelectPage: (title: string) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ onSelectPage }: SearchPanelProps) => {
  const { core } = useGraph();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [results, setResults] = useState<SearchResult | null>(null);

  useEffect(() => {
    if (!core) {
      setResults(null);
      setStatus('idle');
      return;
    }
    if (!query.trim()) {
      setResults(null);
      setStatus('idle');
      return;
    }
    setStatus('loading');
    const handle = window.setTimeout(() => {
      const response = core.search(query.trim());
      if (response.ok) {
        setResults(response.value);
      } else {
        setResults(null);
      }
      setStatus('idle');
    }, 160);
    return () => window.clearTimeout(handle);
  }, [core, query]);

  const handleSelectPage = (page: Page) => {
    setQuery('');
    setResults(null);
    onSelectPage(page.title);
  };

  const handleSelectBlock = (block: Block) => {
    setQuery('');
    setResults(null);
    onSelectPage(block.pageId);
  };

  return (
    <div className="search-panel">
      <input
        className="search-input"
        type="search"
        placeholder="Search pages & blocks"
        value={query}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
      />
      {query && (
        <div className="search-results">
          {status === 'loading' && <p className="search-status">Searching…</p>}
          {status === 'idle' && results && (
            <div className="search-groups">
              <SearchResultsList
                title="Pages"
                emptyMessage="No matching pages"
                items={results.pages}
                onSelect={handleSelectPage}
              />
              <SearchBlockResults
                blocks={results.blocks}
                onSelect={handleSelectBlock}
              />
            </div>
          )}
          {status === 'idle' && !results && <p className="search-status">No matches</p>}
        </div>
      )}
    </div>
  );
};

interface SearchListProps {
  title: string;
  emptyMessage: string;
  items: Page[];
  onSelect: (page: Page) => void;
}

const SearchResultsList: React.FC<SearchListProps> = ({ title, emptyMessage, items, onSelect }: SearchListProps) => (
  <div className="search-section">
    <header className="search-section-header">{title}</header>
    {items.length === 0 ? (
      <p className="search-empty">{emptyMessage}</p>
    ) : (
      <ul className="search-list">
        {items.map((page: Page) => (
          <li key={page.id}>
            <button type="button" className="search-item" onClick={() => onSelect(page)}>
              {page.title}
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

interface SearchBlockResultsProps {
  blocks: Block[];
  onSelect: (block: Block) => void;
}

const SearchBlockResults: React.FC<SearchBlockResultsProps> = ({ blocks, onSelect }: SearchBlockResultsProps) => (
  <div className="search-section">
    <header className="search-section-header">Blocks</header>
    {blocks.length === 0 ? (
      <p className="search-empty">No matching blocks</p>
    ) : (
      <ul className="search-list">
        {blocks.map((block: Block) => (
          <li key={block.id}>
            <button type="button" className="search-item" onClick={() => onSelect(block)}>
              <strong>{block.pageId}</strong>
              <span className="search-snippet">{block.text}</span>
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);
