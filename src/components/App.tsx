import { useState, useRef, useCallback, useEffect } from 'react';
import { Icon } from '@iconify/react';
import type { ViewMode, FormatAction } from '../types';

import { useFileSystem } from '../hooks/useFileSystem';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { Sidebar } from './Sidebar/Sidebar';
import { Toolbar } from './Toolbar/Toolbar';
import { Editor } from './Editor/Editor';
import { CommandPalette } from './CommandPalette/CommandPalette';
import { ContextMenu } from './ContextMenu/ContextMenu';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem('markdown-editor-theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* ignore */ }
  return 'dark';
}

export function App() {
  const {
    rootEntry,
    tabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    openDirectory,
    openFile,
    closeTab,
    updateContent,
    saveFile,
    createFile,
  } = useFileSystem();

  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [scratchContent, setScratchContent] = useState('');
  const [requestNewFile, setRequestNewFile] = useState(false);

  // Apply theme to document root and persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('markdown-editor-theme', theme);
  }, [theme]);

  const insertRef = useRef<((text: string) => void) | null>(null);

  const currentContent = activeTab ? activeTab.content : scratchContent;

  const handleContentChange = useCallback((content: string) => {
    if (activeTab) {
      updateContent(activeTab.id, content);
    } else {
      setScratchContent(content);
    }
  }, [activeTab, updateContent]);

  const handleInsertText = useCallback((text: string) => {
    insertRef.current?.(text);
  }, []);

  const handleSave = useCallback(() => {
    if (activeTabId) {
      saveFile(activeTabId);
    }
  }, [activeTabId, saveFile]);

  useKeyboardShortcuts({
    onSave: handleSave,
    onCommandPalette: () => setShowCommandPalette(true),
    onFind: () => setShowFind(true),
    onNewFile: () => {
      if (rootEntry) setRequestNewFile(true);
    },
  });

  // Context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    const getSelection = (window as unknown as Record<string, unknown>).__editorGetSelection as (() => { text: string; from: number; to: number } | null) | undefined;
    const selection = getSelection?.();

    if (selection) {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleFormat = useCallback((action: FormatAction) => {
    const editorApplyFormat = (window as unknown as Record<string, unknown>).__editorApplyFormat as ((prefix: string, suffix: string) => void) | undefined;
    if (!editorApplyFormat) return;

    const FORMAT_MAP: Record<FormatAction, { prefix: string; suffix: string }> = {
      bold: { prefix: '**', suffix: '**' },
      italic: { prefix: '_', suffix: '_' },
      highlight: { prefix: '==', suffix: '==' },
      strikethrough: { prefix: '~~', suffix: '~~' },
      superscript: { prefix: '<sup>', suffix: '</sup>' },
      subscript: { prefix: '<sub>', suffix: '</sub>' },
    };

    const { prefix, suffix } = FORMAT_MAP[action];
    editorApplyFormat(prefix, suffix);
  }, []);

  const showEmptyState = !activeTab && tabs.length === 0;

  return (
    <div
      style={{ display: 'flex', height: '100vh', width: '100vw' }}
      onContextMenu={handleContextMenu}
    >
      <Sidebar
        rootEntry={rootEntry}
        activeFilePath={activeTab?.path ?? null}
        onOpenDirectory={openDirectory}
        onFileSelect={openFile}
        onCreateFile={createFile}
        requestNewFile={requestNewFile}
        onNewFileDialogDone={() => setRequestNewFile(false)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Toolbar
          viewMode={viewMode}
          theme={theme}
          onViewModeChange={setViewMode}
          onThemeChange={setTheme}
          onInsertText={handleInsertText}
          tabs={tabs}
          activeTabId={activeTabId}
          onTabSelect={setActiveTabId}
          onTabClose={closeTab}
          onFind={() => setShowFind(true)}
        />

        {showEmptyState ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            color: 'var(--text-muted)',
            userSelect: 'none',
          }}>
            <Icon icon="codicon:markdown" width={48} style={{ opacity: 0.3 }} />
            <div style={{ textAlign: 'center', lineHeight: 1.6 }}>
              {rootEntry ? (
                <>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>No file open</p>
                  <p style={{ fontSize: 13 }}>
                    Press <kbd style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                    }}>Ctrl+N</kbd> to create a new note
                  </p>
                  <p style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>
                    or use the <Icon icon="codicon:new-file" width={12} style={{ verticalAlign: 'middle' }} /> button in the sidebar
                  </p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Welcome to FrankMD</p>
                  <p style={{ fontSize: 13 }}>Open a folder to get started</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <Editor
            content={currentContent}
            viewMode={viewMode}
            theme={theme}
            onChange={handleContentChange}
            onInsertRef={insertRef}
            showFind={showFind}
            onCloseFind={() => setShowFind(false)}
          />
        )}
      </div>

      {/* Command Palette */}
      {showCommandPalette && (
        <CommandPalette
          rootEntry={rootEntry}
          onFileSelect={openFile}
          onClose={() => setShowCommandPalette(false)}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onFormat={handleFormat}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
