import React, { useEffect, useState } from 'react';
import type { Backlink } from '@logseq/model';
import { useGraph } from '../state/GraphProvider';

interface BacklinksPanelProps {
  pageTitle: string;
  open: boolean;
  onSelectPage: (title: string) => void;
  onClose: () => void;
}

export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({
  pageTitle,
  open,
  onSelectPage,
  onClose
}: BacklinksPanelProps) => {
  const { core } = useGraph();
  const [links, setLinks] = useState<Backlink[]>([]);

  useEffect(() => {
    if (!core || !open) return;
    const result = core.listLinksToPage(pageTitle);
    if (result.ok) {
      setLinks(result.value);
    } else {
      setLinks([]);
    }
  }, [core, open, pageTitle]);

  if (!open) return null;

  return (
    <aside className="backlinks-panel">
      <header>
        <h3>Backlinks</h3>
        <button type="button" className="logseq-button" onClick={onClose}>
          ✕
        </button>
      </header>
      <div className="backlinks-content">
        {links.length === 0 ? (
          <div className="logseq-empty-state">
            <p>No backlinks yet.</p>
            <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '8px' }}>
              Pages that link to this page will appear here.
            </p>
          </div>
        ) : (
          <ul>
            {links.map((link: Backlink, index: number) => (
              <li key={`${link.sourcePage}-${link.sourceBlockId ?? index}`}>
                <button type="button" onClick={() => onSelectPage(link.sourcePage)}>
                  <span className="backlink-page">{link.sourcePage}</span>
                  {link.sourceBlockId && (
                    <span className="backlink-block">Block: {link.sourceBlockId.slice(0, 8)}...</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
};
