import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Block } from '@logseq/model';

export interface BlockEditorHandle {
  focus: (placement?: 'start' | 'end') => void;
}

interface BlockEditorProps {
  block: Block;
  depth: number;
  hasChildren: boolean;
  collapsed: boolean;
  isFirst: boolean;
  isLast: boolean;
  isFirstInFlat: boolean;
  onTextChange: (blockId: string, text: string) => void;
  onToggleCollapsed: () => void;
  onAddSiblingAfter: () => void;
  onAddChild: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onMergeWithPrev: () => void;
  onSelectPage?: (pageTitle: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  /** When non-null, auto-focus with cursor at this position */
  focusTrigger?: 'start' | 'end' | null;
  onFocusHandled?: () => void;
}

// Parse and render page references [[Page Name]] and block references ((block-id))
const renderTextWithLinks = (
  text: string,
  onSelectPage?: (title: string) => void
): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  const combinedRe = /(\[\[[^\]]+\]\])|(\(\([^)]+\)\))/g;
  let lastIndex = 0;
  let match;
  let keyCounter = 0;

  while ((match = combinedRe.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${keyCounter++}`}>{text.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      const pageTitle = match[1].slice(2, -2);
      parts.push(
        <span
          key={`page-${keyCounter++}`}
          className="logseq-page-ref"
          onClick={e => {
            e.stopPropagation();
            onSelectPage?.(pageTitle);
          }}
          title={`Go to page: ${pageTitle}`}
        >
          {match[1]}
        </span>
      );
    } else if (match[2]) {
      const blockId = match[2].slice(2, -2);
      parts.push(
        <span key={`block-${keyCounter++}`} className="logseq-block-ref" title={`Block reference: ${blockId}`}>
          {match[2]}
        </span>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`text-${keyCounter++}`}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : [<span key="text-0">{text}</span>];
};

const autoResize = (el: HTMLTextAreaElement) => {
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
};

export const BlockEditor: React.FC<BlockEditorProps> = ({
  block,
  depth,
  hasChildren,
  collapsed,
  isFirst,
  isLast,
  isFirstInFlat,
  onTextChange,
  onToggleCollapsed,
  onAddSiblingAfter,
  onAddChild,
  onIndent,
  onOutdent,
  onMoveUp,
  onMoveDown,
  onRemove,
  onMergeWithPrev,
  onSelectPage,
  onFocus,
  onBlur,
  focusTrigger,
  onFocusHandled,
}: BlockEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle external focus trigger (e.g. after Enter creates a new block)
  useLayoutEffect(() => {
    if (focusTrigger == null) return;
    setIsEditing(true);
    // Use setTimeout to ensure the textarea is rendered before focusing
    const id = setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      autoResize(el);
      const len = el.value.length;
      if (focusTrigger === 'start') {
        el.setSelectionRange(0, 0);
      } else {
        el.setSelectionRange(len, len);
      }
      onFocusHandled?.();
    }, 0);
    return () => clearTimeout(id);
  }, [focusTrigger, onFocusHandled]);

  const handleBulletClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasChildren) {
        onToggleCollapsed();
      }
    },
    [hasChildren, onToggleCollapsed]
  );

  const handleContentClick = useCallback(() => {
    setIsEditing(true);
    setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      autoResize(el);
    }, 0);
  }, []);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      autoResize(e.target);
      onTextChange(block.id, e.target.value);
    },
    [block.id, onTextChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const isMac = navigator.platform.toLowerCase().includes('mac') || navigator.userAgent.includes('Mac');
      const metaKey = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onAddSiblingAfter();
        setIsEditing(false);
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          onOutdent();
        } else {
          onIndent();
        }
        return;
      }

      if (e.key === 'Escape') {
        setIsEditing(false);
        textareaRef.current?.blur();
        return;
      }

      if (e.key === 'Backspace' && block.text === '' && !hasChildren) {
        e.preventDefault();
        if (!isFirstInFlat) {
          onMergeWithPrev();
        } else {
          // First block — just remove if empty and no children
          onRemove();
        }
        setIsEditing(false);
        return;
      }

      if (metaKey && e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isFirst) onMoveUp();
        return;
      }

      if (metaKey && e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isLast) onMoveDown();
        return;
      }
    },
    [
      block.text,
      hasChildren,
      isFirst,
      isLast,
      isFirstInFlat,
      onAddSiblingAfter,
      onIndent,
      onOutdent,
      onMoveUp,
      onMoveDown,
      onRemove,
      onMergeWithPrev,
    ]
  );

  const handleFocus = useCallback(() => {
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    onBlur?.();
  }, [onBlur]);

  const renderedContent = renderTextWithLinks(block.text, onSelectPage);

  // Bullet appearance: triangle for collapsible, dot otherwise
  const bulletContent = hasChildren ? (
    <span
      className={`logseq-bullet-triangle ${collapsed ? 'collapsed' : 'expanded'}`}
      title={collapsed ? 'Expand' : 'Collapse'}
    />
  ) : (
    <span className="logseq-bullet-dot" />
  );

  return (
    <div
      className={`logseq-block ${depth > 0 ? 'logseq-block-child' : ''}`}
      style={{ paddingLeft: `${depth * 24}px` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="logseq-block-content">
        <div
          className={`logseq-block-bullet ${hasChildren ? 'has-children' : ''}`}
          onClick={handleBulletClick}
          title={hasChildren ? (collapsed ? 'Expand (click)' : 'Collapse (click)') : undefined}
        >
          {bulletContent}
        </div>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className="logseq-block-input"
            value={block.text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Type something…"
            rows={1}
            style={{ minHeight: '24px' }}
          />
        ) : (
          <div className="logseq-block-text" onClick={handleContentClick}>
            {block.text ? renderedContent : <span className="logseq-block-placeholder">Click to edit…</span>}
          </div>
        )}
      </div>
      {isHovered && (
        <div className="logseq-block-menu">
          <button type="button" className="logseq-block-menu-item" onClick={onAddSiblingAfter} title="Add sibling (Enter)">
            +
          </button>
          <button type="button" className="logseq-block-menu-item" onClick={onAddChild} title="Add child">
            →
          </button>
          <button
            type="button"
            className="logseq-block-menu-item"
            onClick={onIndent}
            disabled={isFirst}
            title="Indent (Tab)"
          >
            ⇥
          </button>
          <button
            type="button"
            className="logseq-block-menu-item"
            onClick={onOutdent}
            title="Outdent (Shift+Tab)"
          >
            ⇤
          </button>
          <button
            type="button"
            className="logseq-block-menu-item"
            onClick={onMoveUp}
            disabled={isFirst}
            title="Move up (⌘↑)"
          >
            ↑
          </button>
          <button
            type="button"
            className="logseq-block-menu-item"
            onClick={onMoveDown}
            disabled={isLast}
            title="Move down (⌘↓)"
          >
            ↓
          </button>
          <button type="button" className="logseq-block-menu-item" onClick={onRemove} title="Delete">
            ×
          </button>
        </div>
      )}
    </div>
  );
};
