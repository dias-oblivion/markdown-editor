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

  function toggleViewMode() {
    onViewModeChange(viewMode === 'editor' ? 'preview' : 'editor');
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

      {/* Floating Action Bar - Right side */}
      <div className={styles.floatingBar}>
        {/* Insert Tools */}
        <div className={styles.floatingGroup}>
          <button
            className={styles.floatingBtn}
            onClick={() => setShowCodeDialog(true)}
            title="Insert Code Block"
          >
            <Icon icon="codicon:code" width={18} />
            <span className={styles.floatingLabel}>Code</span>
          </button>

          <button
            className={styles.floatingBtn}
            onClick={() => setShowTableDialog(true)}
            title="Insert Table"
          >
            <Icon icon="codicon:table" width={18} />
            <span className={styles.floatingLabel}>Table</span>
          </button>

          <button
            className={styles.floatingBtn}
            onClick={onFind}
            title="Find & Replace (Ctrl+F)"
          >
            <Icon icon="codicon:search" width={18} />
            <span className={styles.floatingLabel}>Find</span>
          </button>
        </div>

        <div className={styles.floatingDivider} />

        {/* Claude AI - Special Button */}
        <button
          className={styles.claudeFloatingBtn}
          onClick={() => setShowClaudeDialog(true)}
          title="Claude AI Assistant"
        >
          <ClaudeIcon width={20} height={20} />
          <span className={styles.claudeLabel}>Claude</span>
        </button>
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
