import { useState } from 'react';
import { Icon } from '@iconify/react';
import type { ViewMode, EditorTab, CodeBlockConfig, TableConfig } from '../../types';
import { generateCodeBlock, generateTable } from '../../utils/markdown';
import { CodeBlockDialog } from './CodeBlockDialog';
import { TableDialog } from './TableDialog';
import { ClaudeAssistDialog } from './ClaudeAssistDialog';
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

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.group}>
          <button
            className={styles.button}
            onClick={() => setShowCodeDialog(true)}
            title="Insert Code Block"
          >
            <Icon icon="codicon:code" width={16} />
            <span className={styles.buttonLabel}>Code</span>
          </button>

          <button
            className={styles.button}
            onClick={() => setShowTableDialog(true)}
            title="Insert Table"
          >
            <Icon icon="codicon:table" width={16} />
            <span className={styles.buttonLabel}>Table</span>
          </button>

          <button
            className={`${styles.button} ${styles.claudeButton}`}
            onClick={() => setShowClaudeDialog(true)}
            title="Claude Assist"
          >
            <Icon icon="simple-icons:anthropic" width={16} />
            <span className={styles.buttonLabel}>Claude</span>
          </button>
        </div>

        <div className={styles.separator} />

        <div className={styles.group}>
          <button className={styles.button} onClick={onFind} title="Find & Replace (Ctrl+F)">
            <Icon icon="codicon:search" width={16} />
            <span className={styles.buttonLabel}>Find</span>
          </button>
        </div>

        <div className={styles.spacer} />

        {/* Preview toggle */}
        <button
          className={`${styles.button} ${viewMode === 'preview' ? styles.active : ''}`}
          onClick={toggleViewMode}
          title={viewMode === 'editor' ? 'Show Preview' : 'Show Editor'}
        >
          <Icon
            icon={viewMode === 'preview' ? 'codicon:eye' : 'codicon:eye-closed'}
            width={18}
          />
        </button>

        {/* Theme toggle */}
        <button
          className={styles.button}
          onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          <Icon
            icon={theme === 'dark' ? 'codicon:color-mode' : 'codicon:color-mode'}
            width={18}
          />
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
          fileName={activeTab?.name ?? ''}
          onInsertResult={onInsertText}
          onCancel={() => setShowClaudeDialog(false)}
        />
      )}
    </>
  );
}
