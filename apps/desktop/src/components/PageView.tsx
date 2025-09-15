import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Block, Page } from '@logseq/model';
import { FixedSizeList, type ListChildComponentProps } from 'react-window';
import { useGraph } from '../state/GraphProvider';
import { createBlockId, createTransactionId } from '../lib/ids';
import { joinPath, pageFileName, relativeToRoot } from '../lib/paths';
import {
  cloneTree,
  flattenTree,
  insertBlock,
  loadPageSnapshot,
  moveBlock,
  removeBlock,
  serializePage,
  updateBlockText
} from '../lib/page';
import type { BlockNode, FlattenedBlock } from '../lib/page';
import { createTransaction } from '../types/transaction';
import type { WriteFileOperation } from '../types/system';

interface PageViewProps {
  pageTitle: string;
  onRequestBacklinks: () => void;
}

const ROW_HEIGHT = 68;

export const PageView: React.FC<PageViewProps> = ({ pageTitle, onRequestBacklinks }: PageViewProps) => {
  const { core, root, applyTransaction } = useGraph();
  const [page, setPage] = useState<Page | null>(null);
  const [nodes, setNodes] = useState<BlockNode[]>([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const editSnapshotRef = useRef<BlockNode[] | null>(null);
  const nodesRef = useRef<BlockNode[]>([]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    if (!core) {
      setPage(null);
      setNodes([]);
      return;
    }
    const snapshot = loadPageSnapshot(core, pageTitle);
    setPage(snapshot.page);
    setNodes(snapshot.nodes);
    setStatus(null);
    setError(null);
  }, [core, pageTitle]);

  const relativePath = useMemo(() => {
    if (page?.path && root) {
      return relativeToRoot(page.path, root);
    }
    return pageFileName(pageTitle);
  }, [page, root, pageTitle]);

  const ensurePage = useCallback(() => {
    setPage(prev => {
      if (prev) return prev;
      const path = root ? joinPath(root, relativePath) : relativePath;
      return { id: pageTitle, title: pageTitle, path };
    });
  }, [pageTitle, relativePath, root]);

  const persist = useCallback(
    async (nextNodes: BlockNode[], rollback?: BlockNode[]) => {
      if (!root) {
        setError('Choose a graph root before editing.');
        if (rollback) setNodes(rollback);
        return;
      }
      const operations: WriteFileOperation[] = [
        {
          path: relativePath,
          content: serializePage(pageTitle, nextNodes)
        }
      ];
      const tx = createTransaction(createTransactionId(), operations);
      setSaving(true);
      setStatus(null);
      setError(null);
      const result = await applyTransaction(tx);
      setSaving(false);
      if (result.ok) {
        setStatus('Saved');
      } else {
        if (rollback) setNodes(rollback);
        setError(result.error);
      }
    },
    [applyTransaction, pageTitle, relativePath, root]
  );

  const rows = useMemo<FlattenedBlock[]>(() => flattenTree(nodes), [nodes]);
  const listHeight = useMemo(() => {
    const total = Math.max(rows.length, 1) * ROW_HEIGHT;
    return Math.min(total, 600);
  }, [rows]);

  const createBlock = useCallback(
    (parentId: string | null, text = ''): Block => ({
      id: createBlockId(pageTitle),
      pageId: pageTitle,
      parentId,
      text,
      links: []
    }),
    [pageTitle]
  );

  const handleAddRootBlock = useCallback(() => {
    const previous = cloneTree(nodesRef.current);
    const next = insertBlock(previous, null, previous.length, createBlock(null, ''));
    ensurePage();
    setNodes(next);
    void persist(next, previous);
  }, [createBlock, ensurePage, persist]);

  const handleAddAfter = useCallback(
    (row: FlattenedBlock) => {
      const previous = cloneTree(nodesRef.current);
      const parentId = row.parent ? row.parent.block.id : null;
      const next = insertBlock(previous, parentId, row.index + 1, createBlock(parentId, ''));
      ensurePage();
      setNodes(next);
      void persist(next, previous);
    },
    [createBlock, ensurePage, persist]
  );

  const handleAddChild = useCallback(
    (row: FlattenedBlock) => {
      const previous = cloneTree(nodesRef.current);
      const parentId = row.node.block.id;
      const childCount = row.node.children.length;
      const next = insertBlock(previous, parentId, childCount, createBlock(parentId, ''));
      ensurePage();
      setNodes(next);
      void persist(next, previous);
    },
    [createBlock, ensurePage, persist]
  );

  const handleMove = useCallback(
    (row: FlattenedBlock, direction: 'up' | 'down') => {
      const previous = cloneTree(nodesRef.current);
      const next = moveBlock(previous, row.node.block.id, direction);
      if (serializePage(pageTitle, previous) === serializePage(pageTitle, next)) {
        return;
      }
      setNodes(next);
      void persist(next, previous);
    },
    [pageTitle, persist]
  );

  const handleRemove = useCallback(
    (row: FlattenedBlock) => {
      const previous = cloneTree(nodesRef.current);
      const next = removeBlock(previous, row.node.block.id);
      if (serializePage(pageTitle, previous) === serializePage(pageTitle, next)) {
        return;
      }
      setNodes(next);
      void persist(next, previous);
    },
    [pageTitle, persist]
  );

  const handleTextChange = useCallback((blockId: string, text: string) => {
    setNodes(current => updateBlockText(current, blockId, text));
  }, []);

  const handleFocus = useCallback(() => {
    editSnapshotRef.current = cloneTree(nodesRef.current);
    setStatus(null);
    setError(null);
  }, []);

  const handleBlur = useCallback(() => {
    const snapshot = editSnapshotRef.current;
    editSnapshotRef.current = null;
    if (!snapshot) return;
    const previousContent = serializePage(pageTitle, snapshot);
    const nextContent = serializePage(pageTitle, nodesRef.current);
    if (previousContent === nextContent) return;
    ensurePage();
    void persist(nodesRef.current, snapshot);
  }, [ensurePage, pageTitle, persist]);

  const renderRow = useCallback(
    ({ index, style }: ListChildComponentProps<FlattenedBlock[]>) => {
      const row = rows[index];
      const block = row.node.block;
      const depth = row.depth;
      const siblings = row.parent ? row.parent.children : nodesRef.current;
      const isFirst = row.index === 0;
      const isLast = row.index === siblings.length - 1;
      return (
        <div className="block-row" style={style} data-depth={depth}>
          <div className="block-editor" style={{ marginLeft: depth * 16 }}>
            <textarea
              value={block.text}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => handleTextChange(block.id, event.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
          <div className="block-controls">
            <button type="button" onClick={() => handleAddAfter(row)}>+ Sibling</button>
            <button type="button" onClick={() => handleAddChild(row)}>+ Child</button>
            <button type="button" onClick={() => handleMove(row, 'up')} disabled={isFirst}>
              ↑
            </button>
            <button type="button" onClick={() => handleMove(row, 'down')} disabled={isLast}>
              ↓
            </button>
            <button type="button" onClick={() => handleRemove(row)}>✕</button>
          </div>
        </div>
      );
    },
    [handleAddAfter, handleAddChild, handleBlur, handleMove, handleRemove, handleTextChange, handleFocus, rows]
  );

  return (
    <section className="page-view">
      <header className="page-header">
        <div>
          <h2>{pageTitle}</h2>
          {status && <span className="status">{status}</span>}
          {saving && <span className="status">Saving…</span>}
          {error && <span className="error">{error}</span>}
        </div>
        <div className="page-header-actions">
          <button type="button" onClick={handleAddRootBlock}>
            Add Block
          </button>
          <button type="button" onClick={onRequestBacklinks}>
            View Backlinks
          </button>
        </div>
      </header>
      {nodes.length === 0 ? (
        <div className="empty-state">
          <p>No blocks yet.</p>
          <button type="button" onClick={handleAddRootBlock}>
            Create first block
          </button>
        </div>
      ) : (
        <FixedSizeList
          className="block-list"
          height={listHeight}
          itemCount={rows.length}
          itemSize={ROW_HEIGHT}
          width="100%"
          itemData={rows}
        >
          {renderRow}
        </FixedSizeList>
      )}
    </section>
  );
};
