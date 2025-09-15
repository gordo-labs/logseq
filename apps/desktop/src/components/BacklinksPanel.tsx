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
        <button type="button" onClick={onClose}>
          Close
        </button>
      </header>
      {links.length === 0 ? (
        <p>No backlinks yet.</p>
      ) : (
        <ul>
          {links.map((link: Backlink, index: number) => (
            <li key={`${link.sourcePage}-${link.sourceBlockId ?? index}`}>
              <button type="button" onClick={() => onSelectPage(link.sourcePage)}>
                {link.sourcePage}
                {link.sourceBlockId ? ` · ${link.sourceBlockId}` : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
};
