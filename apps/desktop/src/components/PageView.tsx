import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { VariableSizeList } from 'react-window';
import type { ListChildComponentProps } from 'react-window';
import type { Block, Page } from '@logseq/model';
import { useGraph } from '../state/GraphProvider';
import { createBlockId, createTransactionId } from '../lib/ids';
import { joinPath, pageFileName, relativeToRoot } from '../lib/paths';
import {
  cloneTree,
  flattenTree,
  indentBlock,
  insertBlock,
  loadPageSnapshot,
  moveBlock,
  outdentBlock,
  removeBlock,
  serializePage,
  toggleCollapsed,
  updateBlockText,
} from '../lib/page';
import type { BlockNode, FlattenedBlock } from '../lib/page';
import { createTransaction } from '../types/transaction';
import type { WriteFileOperation } from '../types/system';
import { BlockEditor } from './BlockEditor';
import { isJournalTitle, getPreviousDay, getNextDay, getRelativeDay } from '../lib/dates';

interface PageViewProps {
  pageTitle: string;
  onRequestBacklinks: () => void;
}

interface PendingFocus {
  blockId: string;
  placement: 'start' | 'end';
}

/** Data passed via react-window itemData to each row renderer */
interface RowData {
  rows: FlattenedBlock[];
  pendingFocus: PendingFocus | null;
  onFocusHandled: () => void;
  itemHeights: React.MutableRefObject<number[]>;
  listRef: React.RefObject<VariableSizeList<RowData>>;
  onTextChange: (id: string, text: string) => void;
  onAddSiblingAfter: (row: FlattenedBlock) => void;
  onAddChild: (row: FlattenedBlock) => void;
  onIndent: (row: FlattenedBlock) => void;
  onOutdent: (row: FlattenedBlock) => void;
  onMoveUp: (row: FlattenedBlock) => void;
  onMoveDown: (row: FlattenedBlock) => void;
  onRemove: (row: FlattenedBlock) => void;
  onToggleCollapsed: (row: FlattenedBlock) => void;
  onMergeWithPrev: (row: FlattenedBlock) => void;
  onSelectPage: (title: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}

const DEFAULT_ROW_HEIGHT = 32;

/**
 * VirtualRow is defined OUTSIDE PageView so it has a stable identity.
 * react-window requires stable component references to avoid remounting items.
 */
const VirtualRow: React.FC<ListChildComponentProps<RowData>> = ({ index, style, data }) => {
  const {
    rows,
    pendingFocus,
    onFocusHandled,
    itemHeights,
    listRef,
    onTextChange,
    onAddSiblingAfter,
    onAddChild,
    onIndent,
    onOutdent,
    onMoveUp,
    onMoveDown,
    onRemove,
    onToggleCollapsed,
    onMergeWithPrev,
    onSelectPage,
    onFocus,
    onBlur,
  } = data;

  const row = rows[index];
  const innerRef = useRef<HTMLDivElement>(null);

  // Measure actual height and notify the list when it changes
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.offsetHeight;
      if (h > 0 && itemHeights.current[index] !== h) {
        itemHeights.current[index] = h;
        listRef.current?.resetAfterIndex(index, false);
      }
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [index, itemHeights, listRef]);

  if (!row) return null;

  const isFocused = pendingFocus?.blockId === row.node.block.id;

  return (
    <div style={style}>
      <div ref={innerRef}>
        <BlockEditor
          block={row.node.block}
          depth={row.depth}
          hasChildren={row.node.children.length > 0}
          collapsed={row.node.collapsed ?? false}
          isFirst={row.index === 0}
          isLast={row.index === row.siblingCount - 1}
          isFirstInFlat={index === 0}
          onTextChange={onTextChange}
          onToggleCollapsed={() => onToggleCollapsed(row)}
          onAddSiblingAfter={() => onAddSiblingAfter(row)}
          onAddChild={() => onAddChild(row)}
          onIndent={() => onIndent(row)}
          onOutdent={() => onOutdent(row)}
          onMoveUp={() => onMoveUp(row)}
          onMoveDown={() => onMoveDown(row)}
          onRemove={() => onRemove(row)}
          onMergeWithPrev={() => onMergeWithPrev(row)}
          onSelectPage={onSelectPage}
          onFocus={onFocus}
          onBlur={onBlur}
          focusTrigger={isFocused ? pendingFocus!.placement : null}
          onFocusHandled={onFocusHandled}
        />
      </div>
    </div>
  );
};

export const PageView: React.FC<PageViewProps> = ({ pageTitle, onRequestBacklinks }) => {
  const { core, root, applyTransaction, loadPage } = useGraph();
  const [page, setPage] = useState<Page | null>(null);
  const [nodes, setNodes] = useState<BlockNode[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingFocus, setPendingFocus] = useState<PendingFocus | null>(null);
  const [listHeight, setListHeight] = useState(500);

  const editSnapshotRef = useRef<BlockNode[] | null>(null);
  const nodesRef = useRef<BlockNode[]>([]);
  const listRef = useRef<VariableSizeList<RowData>>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const itemHeights = useRef<number[]>([]);

  // Journal page detection
  const isJournal = useMemo(() => isJournalTitle(pageTitle), [pageTitle]);
  const relativeDay = useMemo(() => getRelativeDay(pageTitle), [pageTitle]);

  // Keep nodesRef in sync
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Load page data when pageTitle or core changes
  useEffect(() => {
    if (!core) {
      setPage(null);
      setNodes([]);
      return;
    }
    const loadPageData = async () => {
      setLoadingPage(true);
      try {
        await loadPage(pageTitle);
        const snapshot = loadPageSnapshot(core, pageTitle);
        setPage(snapshot.page);
        setNodes(snapshot.nodes);
        // Reset virtual list state
        itemHeights.current = [];
        listRef.current?.resetAfterIndex(0, true);
        setStatus(null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoadingPage(false);
      }
    };
    void loadPageData();
  }, [core, pageTitle, loadPage]);

  // Measure container height for the virtual list
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => setListHeight(el.clientHeight || 500);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Invalidate height cache when page changes
  useEffect(() => {
    itemHeights.current = [];
    listRef.current?.resetAfterIndex(0, true);
  }, [pageTitle]);

  const relativePath = useMemo(() => {
    if (page?.path && root) return relativeToRoot(page.path, root);
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
        { path: relativePath, content: serializePage(pageTitle, nextNodes) },
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

  // Flattened rows (respects collapsed state)
  const rows = useMemo<FlattenedBlock[]>(() => flattenTree(nodes), [nodes]);

  const getItemSize = useCallback(
    (index: number) => itemHeights.current[index] ?? DEFAULT_ROW_HEIGHT,
    []
  );

  const createBlock = useCallback(
    (parentId: string | null, text = ''): Block => ({
      id: createBlockId(pageTitle),
      pageId: pageTitle,
      parentId,
      text,
      links: [],
    }),
    [pageTitle]
  );

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleAddRootBlock = useCallback(() => {
    const previous = cloneTree(nodesRef.current);
    const newBlock = createBlock(null, '');
    const next = insertBlock(previous, null, previous.length, newBlock);
    ensurePage();
    setNodes(next);
    setPendingFocus({ blockId: newBlock.id, placement: 'end' });
    void persist(next, previous);
  }, [createBlock, ensurePage, persist]);

  const handleAddSiblingAfter = useCallback(
    (row: FlattenedBlock) => {
      const previous = cloneTree(nodesRef.current);
      const parentId = row.parent ? row.parent.block.id : null;
      const newBlock = createBlock(parentId, '');
      const next = insertBlock(previous, parentId, row.index + 1, newBlock);
      ensurePage();
      setNodes(next);
      setPendingFocus({ blockId: newBlock.id, placement: 'end' });
      void persist(next, previous);
    },
    [createBlock, ensurePage, persist]
  );

  const handleAddChild = useCallback(
    (row: FlattenedBlock) => {
      const previous = cloneTree(nodesRef.current);
      const parentId = row.node.block.id;
      const childCount = row.node.children.length;
      const newBlock = createBlock(parentId, '');
      const next = insertBlock(previous, parentId, childCount, newBlock);
      ensurePage();
      setNodes(next);
      setPendingFocus({ blockId: newBlock.id, placement: 'end' });
      void persist(next, previous);
    },
    [createBlock, ensurePage, persist]
  );

  const handleIndent = useCallback(
    (row: FlattenedBlock) => {
      if (row.index === 0) return; // First sibling — can't indent
      const previous = cloneTree(nodesRef.current);
      const next = indentBlock(previous, row.node.block.id);
      setNodes(next);
      setPendingFocus({ blockId: row.node.block.id, placement: 'end' });
      void persist(next, previous);
    },
    [persist]
  );

  const handleOutdent = useCallback(
    (row: FlattenedBlock) => {
      if (!row.parent) return; // Already at root level
      const previous = cloneTree(nodesRef.current);
      const next = outdentBlock(previous, row.node.block.id);
      setNodes(next);
      setPendingFocus({ blockId: row.node.block.id, placement: 'end' });
      void persist(next, previous);
    },
    [persist]
  );

  const handleMove = useCallback(
    (row: FlattenedBlock, direction: 'up' | 'down') => {
      const previous = cloneTree(nodesRef.current);
      const next = moveBlock(previous, row.node.block.id, direction);
      if (serializePage(pageTitle, previous) === serializePage(pageTitle, next)) return;
      setNodes(next);
      setPendingFocus({ blockId: row.node.block.id, placement: 'end' });
      void persist(next, previous);
    },
    [pageTitle, persist]
  );

  const handleRemove = useCallback(
    (row: FlattenedBlock) => {
      const previous = cloneTree(nodesRef.current);
      const next = removeBlock(previous, row.node.block.id);
      if (serializePage(pageTitle, previous) === serializePage(pageTitle, next)) return;
      setNodes(next);
      // Focus previous block if available
      const prevFlatIdx = row.flatIndex - 1;
      const currentRows = flattenTree(previous);
      if (prevFlatIdx >= 0 && currentRows[prevFlatIdx]) {
        setPendingFocus({ blockId: currentRows[prevFlatIdx].node.block.id, placement: 'end' });
      }
      void persist(next, previous);
    },
    [pageTitle, persist]
  );

  const handleToggleCollapsed = useCallback((row: FlattenedBlock) => {
    const next = toggleCollapsed(nodesRef.current, row.node.block.id);
    setNodes(next);
    // No persist needed — collapsed state is not saved to disk
  }, []);

  const handleMergeWithPrev = useCallback(
    (row: FlattenedBlock) => {
      if (row.flatIndex === 0) return; // Nothing above to merge with
      if (row.node.children.length > 0) return; // Don't merge block with children

      const currentRows = flattenTree(nodesRef.current);
      const prevRow = currentRows[row.flatIndex - 1];
      if (!prevRow) return;

      const previous = cloneTree(nodesRef.current);
      // Append current text to previous (usually empty + empty = delete)
      const combinedText = prevRow.node.block.text + row.node.block.text;
      let next = updateBlockText(previous, prevRow.node.block.id, combinedText);
      next = removeBlock(next, row.node.block.id);
      setNodes(next);
      setPendingFocus({ blockId: prevRow.node.block.id, placement: 'end' });
      void persist(next, previous);
    },
    [persist]
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

  const handleSelectPage = useCallback((title: string) => {
    window.dispatchEvent(new CustomEvent('logseq:select-page', { detail: { pageTitle: title } }));
  }, []);

  const handleFocusHandled = useCallback(() => {
    setPendingFocus(null);
  }, []);

  const handlePrevDay = useCallback(() => {
    const prevDay = getPreviousDay(pageTitle);
    handleSelectPage(prevDay);
  }, [pageTitle, handleSelectPage]);

  const handleNextDay = useCallback(() => {
    const nextDay = getNextDay(pageTitle);
    handleSelectPage(nextDay);
  }, [pageTitle, handleSelectPage]);

  // Stable itemData for react-window
  const rowData = useMemo<RowData>(
    () => ({
      rows,
      pendingFocus,
      onFocusHandled: handleFocusHandled,
      itemHeights,
      listRef,
      onTextChange: handleTextChange,
      onAddSiblingAfter: handleAddSiblingAfter,
      onAddChild: handleAddChild,
      onIndent: handleIndent,
      onOutdent: handleOutdent,
      onMoveUp: (row: FlattenedBlock) => handleMove(row, 'up'),
      onMoveDown: (row: FlattenedBlock) => handleMove(row, 'down'),
      onRemove: handleRemove,
      onToggleCollapsed: handleToggleCollapsed,
      onMergeWithPrev: handleMergeWithPrev,
      onSelectPage: handleSelectPage,
      onFocus: handleFocus,
      onBlur: handleBlur,
    }),
    [
      rows,
      pendingFocus,
      handleFocusHandled,
      handleTextChange,
      handleAddSiblingAfter,
      handleAddChild,
      handleIndent,
      handleOutdent,
      handleMove,
      handleRemove,
      handleToggleCollapsed,
      handleMergeWithPrev,
      handleSelectPage,
      handleFocus,
      handleBlur,
    ]
  );

  return (
    <section className="logseq-page-view" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="logseq-page-header">
        <div>
          <h1 className="logseq-page-title">{pageTitle}</h1>
          {relativeDay && (
            <span style={{ fontSize: '13px', color: 'var(--ls-secondary-text-color)', marginTop: '4px', display: 'block' }}>
              {relativeDay}
            </span>
          )}
        </div>
        <div className="logseq-page-actions">
          {status && <span className="logseq-status">{status}</span>}
          {saving && <span className="logseq-status">Saving…</span>}
          {error && <span className="logseq-error">{error}</span>}
          <button type="button" className="logseq-button" onClick={onRequestBacklinks}>
            🔗 Backlinks
          </button>
        </div>
      </div>

      {/* Journal Navigation */}
      {isJournal && (
        <div className="logseq-journal-nav">
          <button type="button" onClick={handlePrevDay}>
            ← Previous Day
          </button>
          <button type="button" onClick={handleNextDay}>
            Next Day →
          </button>
        </div>
      )}

      <div
        className="logseq-page-content"
        ref={contentRef}
        style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}
      >
        {loadingPage ? (
          <div className="logseq-empty-state">
            <p>Loading page…</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="logseq-empty-state">
            <p>No blocks yet. Click below to create your first block.</p>
            <button type="button" className="logseq-button-primary" onClick={handleAddRootBlock}>
              Create first block
            </button>
          </div>
        ) : (
          <>
            <VariableSizeList<RowData>
              ref={listRef}
              height={listHeight}
              itemCount={rows.length}
              itemSize={getItemSize}
              width="100%"
              itemData={rowData}
              overscanCount={8}
              style={{ overflowX: 'hidden' }}
            >
              {VirtualRow}
            </VariableSizeList>
            <button
              type="button"
              className="logseq-add-block-button"
              onClick={handleAddRootBlock}
              title="Add new block (click or press Enter on last block)"
            >
              + Add block
            </button>
          </>
        )}
      </div>
    </section>
  );
};
