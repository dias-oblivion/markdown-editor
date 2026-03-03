import { useState } from 'react';
import { Icon } from '@iconify/react';
import type { ViewMode, EditorTab, CodeBlockConfig, TableConfig } from '../../types';
import { generateCodeBlock, generateTable } from '../../utils/markdown';
import { CodeBlockDialog } from './CodeBlockDialog';
import { TableDialog } from './TableDialog';
import { ClaudeAssistDialog } from './ClaudeAssistDialog';
import { ClaudeIcon } from './ClaudeIcon';
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
}: ToolbarProps) {
  const activeTab = tabs.find(t => t.id === activeTabId) ?? null;
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [showClaudeDialog, setShowClaudeDialog] = useState(false);

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

      {/* Top bar - minimal with view controls */}
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

            <button
              className={styles.headerClaudeBtn}
              onClick={() => setShowClaudeDialog(true)}
              title="Claude"
            >
              <ClaudeIcon width={14} height={14} />
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

          {/* Theme toggle */}
          <button
            className={styles.themeToggle}
            onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          >
            <Icon icon={theme === 'dark' ? 'ph:sun-bold' : 'ph:moon-bold'} width={16} />
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
      {showClaudeDialog && (
        <ClaudeAssistDialog
          content={activeTab?.content ?? ''}
          fileName={activeTab?.path ?? activeTab?.name ?? ''}
          onInsertResult={onInsertText}
          onCancel={() => setShowClaudeDialog(false)}
        />
      )}
    </>
  );
}
