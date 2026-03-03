import { useState } from 'react';
import { Icon } from '@iconify/react';
import type { ViewMode, EditorTab, CodeBlockConfig, TableConfig } from '../../types';
import { generateCodeBlock, generateTable } from '../../utils/markdown';
import { CodeBlockDialog } from './CodeBlockDialog';
import { TableDialog } from './TableDialog';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  viewMode: ViewMode;
  theme: 'light' | 'dark';
  onViewModeChange: (mode: ViewMode) => void;
  onThemeChange: (theme: 'light' | 'dark') => void;
  onInsertText: (text: string) => void;
  tabs: EditorTab[];
  activeTabId: string | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onFind: () => void;
  chatVisible: boolean;
  onToggleChat: () => void;
}

export function Toolbar({
  viewMode,
  theme,
  onViewModeChange,
  onThemeChange,
  onInsertText,
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onFind,
  chatVisible,
  onToggleChat,
}: ToolbarProps) {
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);

  function handleInsertCode(config: CodeBlockConfig) {
    onInsertText(generateCodeBlock(config));
    setShowCodeDialog(false);
  }

  function handleInsertTable(config: TableConfig) {
    onInsertText(generateTable(config));
    setShowTableDialog(false);
  }

  function applyInlineFormat(prefix: string, suffix: string) {
    const applyFormat = (window as unknown as Record<string, unknown>).__editorApplyFormat as ((p: string, s: string) => void) | undefined;
    if (applyFormat) {
      applyFormat(prefix, suffix);
    }
  }

  function insertLinePrefix(prefix: string) {
    onInsertText(prefix);
  }


  return (
    <>
      {/* Tabs bar */}
      {tabs.length > 0 && (
        <div className={styles.tabsBar}>
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`${styles.tab} ${tab.id === activeTabId ? styles.active : ''}`}
              onClick={() => onTabSelect(tab.id)}
            >
              <Icon icon="vscode-icons:file-type-markdown" width={14} />
              <span className={tab.isDirty ? styles.dirty : ''}>
                {tab.isDirty ? '● ' : ''}{tab.name}
              </span>
              <button
                className={styles.tabClose}
                onClick={e => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
              >
                <Icon icon="codicon:close" width={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <span className={styles.appTitle}>Markdown Editor</span>

          <div className={styles.headerDivider} />

          {/* Formatting buttons */}
          <div className={styles.headerActions}>
            <button
              className={styles.headerBtn}
              onClick={() => applyInlineFormat('**', '**')}
              title="Bold"
            >
              <Icon icon="codicon:bold" width={14} />
            </button>

            <button
              className={styles.headerBtn}
              onClick={() => applyInlineFormat('_', '_')}
              title="Italic"
            >
              <Icon icon="codicon:italic" width={14} />
            </button>

            <button
              className={styles.headerBtn}
              onClick={() => applyInlineFormat('<u>', '</u>')}
              title="Underline"
            >
              <Icon icon="lucide:underline" width={14} />
            </button>

            <button
              className={styles.headerBtn}
              onClick={() => applyInlineFormat('~~', '~~')}
              title="Strikethrough"
            >
              <Icon icon="codicon:strikethrough" width={14} />
            </button>
          </div>

          <div className={styles.headerDivider} />

          <div className={styles.headerActions}>
            <button
              className={styles.headerBtn}
              onClick={() => applyInlineFormat('[', '](url)')}
              title="Link"
            >
              <Icon icon="codicon:link" width={14} />
            </button>

            <button
              className={styles.headerBtn}
              onClick={() => insertLinePrefix('1. ')}
              title="Ordered List"
            >
              <Icon icon="codicon:list-ordered" width={14} />
            </button>

            <button
              className={styles.headerBtn}
              onClick={() => insertLinePrefix('- ')}
              title="Bulleted List"
            >
              <Icon icon="codicon:list-unordered" width={14} />
            </button>

            <button
              className={styles.headerBtn}
              onClick={() => insertLinePrefix('> ')}
              title="Blockquote"
            >
              <Icon icon="codicon:quote" width={14} />
            </button>
          </div>

          <div className={styles.headerDivider} />

          {/* Tool buttons */}
          <div className={styles.headerActions}>
            <button
              className={styles.headerBtn}
              onClick={() => setShowCodeDialog(true)}
              title="Code"
            >
              <Icon icon="codicon:code" width={14} />
            </button>

            <button
              className={styles.headerBtn}
              onClick={() => setShowTableDialog(true)}
              title="Table"
            >
              <Icon icon="codicon:table" width={14} />
            </button>

            <button
              className={styles.headerBtn}
              onClick={onFind}
              title="Find (Ctrl+F)"
            >
              <Icon icon="codicon:search" width={14} />
            </button>

          </div>
        </div>

        <div className={styles.topBarRight}>
          {/* View mode toggle */}
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewToggleBtn} ${viewMode === 'editor' ? styles.active : ''}`}
              onClick={() => onViewModeChange('editor')}
              title="Editor Mode"
            >
              <Icon icon="codicon:edit" width={14} />
              <span>Edit</span>
            </button>
            <button
              className={`${styles.viewToggleBtn} ${viewMode === 'preview' ? styles.active : ''}`}
              onClick={() => onViewModeChange('preview')}
              title="Preview Mode (Ctrl+Shift+V)"
            >
              <Icon icon="codicon:eye" width={14} />
              <span>Preview</span>
            </button>
          </div>

          <div className={styles.topBarSep} />

          {/* Theme toggle */}
          <button
            className={styles.themeToggle}
            onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          >
            <Icon icon={theme === 'dark' ? 'ph:sun-bold' : 'ph:moon-bold'} width={16} />
          </button>

          <div className={styles.topBarSep} />

          {/* Claude Chat toggle */}
          <button
            className={`${styles.claudeToggleBtn} ${chatVisible ? styles.claudeToggleActive : ''}`}
            onClick={onToggleChat}
            title="Claude Chat (Ctrl+Shift+C)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M17.304 1.273c-1.26-.407-2.656-.125-3.656.782L6.895 8.427c-.984.893-1.328 2.278-.868 3.521l1.618 4.437c.336.92.188 1.945-.394 2.726l-1.782 2.38a.75.75 0 0 0 1.199.899l1.782-2.38c.863-1.152 1.092-2.668.61-4.02L7.442 11.57c-.293-.803-.077-1.699.547-2.27l6.753-6.372a2.44 2.44 0 0 1 2.308-.494c.795.257 1.375.937 1.5 1.766l.977 6.419c.165 1.088-.237 2.18-1.057 2.9L11.22 19.6a.75.75 0 0 0 1.007 1.113l7.25-6.08c1.194-1.001 1.79-2.568 1.551-4.123l-.977-6.42a3.937 3.937 0 0 0-2.747-2.817Z"
                fill="currentColor"
              />
              <path
                d="M4.577 6.289a.75.75 0 0 0-1.154.955l2.165 2.617a2.44 2.44 0 0 1 .494 2.308l-2.013 6.22a3.937 3.937 0 0 0 2.014 4.75c1.165.563 2.556.47 3.634-.24l7.03-4.618a.75.75 0 1 0-.816-1.26l-7.03 4.618a2.44 2.44 0 0 1-2.255.15 2.437 2.437 0 0 1-1.247-2.943l2.013-6.22c.386-1.192.065-2.5-.826-3.578L4.577 6.29Z"
                fill="currentColor"
              />
            </svg>
            <span>Claude</span>
          </button>
        </div>
      </div>


      {/* Dialogs */}
      {showCodeDialog && (
        <CodeBlockDialog
          onInsert={handleInsertCode}
          onCancel={() => setShowCodeDialog(false)}
        />
      )}
      {showTableDialog && (
        <TableDialog
          onInsert={handleInsertTable}
          onCancel={() => setShowTableDialog(false)}
        />
      )}
    </>
  );
}
