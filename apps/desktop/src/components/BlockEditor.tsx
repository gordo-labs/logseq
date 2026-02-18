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

// Task markers supported by Logseq
const TASK_MARKERS = ['TODO', 'DOING', 'DONE', 'NOW', 'LATER', 'WAITING', 'CANCELLED'] as const;
type TaskMarker = typeof TASK_MARKERS[number];

// Slash commands
interface SlashCommand {
  name: string;
  label: string;
  icon: string;
  action: (text: string, cursorPos: number) => { text: string; cursorPos: number };
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: 'TODO',
    label: 'TODO',
    icon: '☐',
    action: (text, pos) => ({ text: insertAtCursor(text, pos, 'TODO '), cursorPos: pos + 5 }),
  },
  {
    name: 'DOING',
    label: 'DOING',
    icon: '⏳',
    action: (text, pos) => ({ text: insertAtCursor(text, pos, 'DOING '), cursorPos: pos + 6 }),
  },
  {
    name: 'DONE',
    label: 'DONE',
    icon: '✓',
    action: (text, pos) => ({ text: insertAtCursor(text, pos, 'DONE '), cursorPos: pos + 5 }),
  },
  {
    name: 'NOW',
    label: 'NOW',
    icon: '▶',
    action: (text, pos) => ({ text: insertAtCursor(text, pos, 'NOW '), cursorPos: pos + 4 }),
  },
  {
    name: 'LATER',
    label: 'LATER',
    icon: '📋',
    action: (text, pos) => ({ text: insertAtCursor(text, pos, 'LATER '), cursorPos: pos + 6 }),
  },
  {
    name: 'WAITING',
    label: 'WAITING',
    icon: '⏸',
    action: (text, pos) => ({ text: insertAtCursor(text, pos, 'WAITING '), cursorPos: pos + 8 }),
  },
  {
    name: 'date',
    label: 'Current Date',
    icon: '📅',
    action: (text, pos) => {
      const date = new Date();
      const dateStr = `[[${date.toISOString().split('T')[0]}]]`;
      return { text: insertAtCursor(text, pos, dateStr), cursorPos: pos + dateStr.length };
    },
  },
  {
    name: 'time',
    label: 'Current Time',
    icon: '🕐',
    action: (text, pos) => {
      const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      return { text: insertAtCursor(text, pos, time), cursorPos: pos + time.length };
    },
  },
  {
    name: 'pageref',
    label: 'Page Reference',
    icon: '📄',
    action: (text, pos) => ({ text: insertAtCursor(text, pos, '[[]]'), cursorPos: pos + 2 }),
  },
  {
    name: 'blockref',
    label: 'Block Reference',
    icon: '🔗',
    action: (text, pos) => ({ text: insertAtCursor(text, pos, '(())'), cursorPos: pos + 2 }),
  },
  {
    name: 'code',
    label: 'Code Block',
    icon: '💻',
    action: (text, pos) => ({ text: insertAtCursor(text, pos, '```\n\n```'), cursorPos: pos + 4 }),
  },
  {
    name: 'quote',
    label: 'Quote',
    icon: '❝',
    action: (text, pos) => ({ text: insertAtCursor(text, pos, '> '), cursorPos: pos + 2 }),
  },
];

function insertAtCursor(text: string, pos: number, insert: string): string {
  return text.slice(0, pos) + insert + text.slice(pos);
}

// Extract marker from text
function extractMarker(text: string): { marker: TaskMarker | null; restText: string } {
  const trimmed = text.trimStart();
  for (const marker of TASK_MARKERS) {
    if (trimmed.startsWith(marker + ' ') || trimmed === marker) {
      const restText = trimmed.slice(marker.length).trimStart();
      return { marker, restText };
    }
  }
  return { marker: null, restText: text };
}

// Cycle through markers: null -> TODO -> DOING -> DONE -> null
function cycleMarker(current: TaskMarker | null): TaskMarker | null {
  if (!current) return 'TODO';
  if (current === 'TODO') return 'DOING';
  if (current === 'DOING') return 'DONE';
  if (current === 'DONE') return null;
  if (current === 'NOW') return 'DONE';
  if (current === 'LATER') return 'NOW';
  if (current === 'WAITING') return 'DONE';
  if (current === 'CANCELLED') return null;
  return null;
}

// Parse and render text with links, tags, code, etc.
const renderTextWithFormatting = (
  text: string,
  onSelectPage?: (title: string) => void,
  onToggleMarker?: () => void
): React.ReactNode[] => {
  const { marker, restText } = extractMarker(text);
  const parts: React.ReactNode[] = [];
  let keyCounter = 0;

  // Add marker if present
  if (marker) {
    parts.push(
      <span
        key={`marker-${keyCounter++}`}
        className={`logseq-marker logseq-marker-${marker}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleMarker?.();
        }}
        title={`Click to toggle (${marker})`}
      >
        <span className="logseq-checkbox" />
        {marker}
      </span>
    );
  }

  // Combined regex for all patterns
  const combinedRe = /(\[\[[^\]]+\]\])|(\(\([^)]+\)\))|(#[a-zA-Z][a-zA-Z0-9_-]*)|(`[^`]+`)/g;
  let lastIndex = 0;
  let match;

  while ((match = combinedRe.exec(restText)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${keyCounter++}`}>{restText.slice(lastIndex, match.index)}</span>);
    }

    if (match[1]) {
      // Page reference [[Page Name]]
      const pageTitle = match[1].slice(2, -2);
      parts.push(
        <span
          key={`page-${keyCounter++}`}
          className="logseq-page-ref"
          onClick={(e) => {
            e.stopPropagation();
            onSelectPage?.(pageTitle);
          }}
          title={`Go to: ${pageTitle}`}
        >
          {match[1]}
        </span>
      );
    } else if (match[2]) {
      // Block reference ((block-id))
      const blockId = match[2].slice(2, -2);
      parts.push(
        <span
          key={`block-${keyCounter++}`}
          className="logseq-block-ref"
          title={`Block: ${blockId}`}
        >
          {match[2]}
        </span>
      );
    } else if (match[3]) {
      // Tag #tag
      const tag = match[3].slice(1);
      parts.push(
        <span
          key={`tag-${keyCounter++}`}
          className="logseq-tag"
          onClick={(e) => {
            e.stopPropagation();
            onSelectPage?.(tag);
          }}
          title={`Tag: ${tag}`}
        >
          {match[3]}
        </span>
      );
    } else if (match[4]) {
      // Inline code `code`
      const code = match[4].slice(1, -1);
      parts.push(
        <code key={`code-${keyCounter++}`} className="logseq-inline-code">
          {code}
        </code>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < restText.length) {
    parts.push(<span key={`text-${keyCounter++}`}>{restText.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : [<span key="empty">{text}</span>];
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
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuIndex, setSlashMenuIndex] = useState(0);
  const [slashFilter, setSlashFilter] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const slashPosRef = useRef<number>(0);

  // Filter slash commands
  const filteredCommands = SLASH_COMMANDS.filter(cmd =>
    cmd.name.toLowerCase().includes(slashFilter.toLowerCase()) ||
    cmd.label.toLowerCase().includes(slashFilter.toLowerCase())
  );

  // Handle external focus trigger
  useLayoutEffect(() => {
    if (focusTrigger == null) return;
    setIsEditing(true);
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
      const newText = e.target.value;
      const cursorPos = e.target.selectionStart;
      
      // Check for slash command trigger
      const textBeforeCursor = newText.slice(0, cursorPos);
      const slashMatch = textBeforeCursor.match(/\/([a-zA-Z]*)$/);
      
      if (slashMatch) {
        setSlashMenuOpen(true);
        setSlashFilter(slashMatch[1]);
        setSlashMenuIndex(0);
        slashPosRef.current = cursorPos - slashMatch[0].length;
      } else {
        setSlashMenuOpen(false);
        setSlashFilter('');
      }
      
      onTextChange(block.id, newText);
    },
    [block.id, onTextChange]
  );

  const handleSlashCommand = useCallback((cmd: SlashCommand) => {
    const el = textareaRef.current;
    if (!el) return;
    
    // Remove the slash and filter text
    const textWithoutSlash = block.text.slice(0, slashPosRef.current) + block.text.slice(el.selectionStart);
    const result = cmd.action(textWithoutSlash, slashPosRef.current);
    
    onTextChange(block.id, result.text);
    setSlashMenuOpen(false);
    setSlashFilter('');
    
    // Set cursor position
    setTimeout(() => {
      if (el) {
        el.focus();
        el.setSelectionRange(result.cursorPos, result.cursorPos);
      }
    }, 0);
  }, [block.id, block.text, onTextChange]);

  const handleToggleMarker = useCallback(() => {
    const { marker, restText } = extractMarker(block.text);
    const newMarker = cycleMarker(marker);
    const leadingWhitespace = block.text.match(/^\s*/)?.[0] || '';
    const newText = newMarker 
      ? `${leadingWhitespace}${newMarker} ${restText}`
      : `${leadingWhitespace}${restText}`;
    onTextChange(block.id, newText);
  }, [block.id, block.text, onTextChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const isMac = navigator.platform.toLowerCase().includes('mac') || navigator.userAgent.includes('Mac');
      const metaKey = isMac ? e.metaKey : e.ctrlKey;

      // Handle slash menu navigation
      if (slashMenuOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSlashMenuIndex(i => Math.min(i + 1, filteredCommands.length - 1));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSlashMenuIndex(i => Math.max(i - 1, 0));
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          if (filteredCommands[slashMenuIndex]) {
            handleSlashCommand(filteredCommands[slashMenuIndex]);
          }
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setSlashMenuOpen(false);
          setSlashFilter('');
          return;
        }
      }

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
        setSlashMenuOpen(false);
        textareaRef.current?.blur();
        return;
      }

      if (e.key === 'Backspace' && block.text === '' && !hasChildren) {
        e.preventDefault();
        if (!isFirstInFlat) {
          onMergeWithPrev();
        } else {
          onRemove();
        }
        setIsEditing(false);
        return;
      }

      // Toggle TODO marker with Cmd/Ctrl + Enter
      if (metaKey && e.key === 'Enter') {
        e.preventDefault();
        handleToggleMarker();
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
      slashMenuOpen,
      filteredCommands,
      slashMenuIndex,
      handleSlashCommand,
      handleToggleMarker,
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
    setSlashMenuOpen(false);
    onBlur?.();
  }, [onBlur]);

  const renderedContent = renderTextWithFormatting(block.text, onSelectPage, handleToggleMarker);

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
      style={{ 
        paddingLeft: `${depth * 22}px`,
        '--depth': depth,
      } as React.CSSProperties}
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
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              ref={textareaRef}
              className="logseq-block-input"
              value={block.text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="Type something… (/ for commands)"
              rows={1}
              style={{ minHeight: '24px' }}
            />
            {slashMenuOpen && filteredCommands.length > 0 && (
              <div className="slash-command-menu">
                {filteredCommands.map((cmd, idx) => (
                  <div
                    key={cmd.name}
                    className={`slash-command-item ${idx === slashMenuIndex ? 'selected' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSlashCommand(cmd);
                    }}
                    onMouseEnter={() => setSlashMenuIndex(idx)}
                  >
                    <span className="slash-command-icon">{cmd.icon}</span>
                    <span className="slash-command-label">{cmd.label}</span>
                    <span className="slash-command-shortcut">/{cmd.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="logseq-block-text" onClick={handleContentClick}>
            {block.text ? renderedContent : <span className="logseq-block-placeholder">Click to edit…</span>}
          </div>
        )}
      </div>
      {isHovered && !isEditing && (
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
            disabled={depth === 0}
            title="Outdent (Shift+Tab)"
          >
            ⇤
          </button>
          <button type="button" className="logseq-block-menu-item" onClick={onRemove} title="Delete">
            ×
          </button>
        </div>
      )}
    </div>
  );
};
