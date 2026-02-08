import { useState, useRef, useCallback, useEffect } from 'react';
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
  } = useFileSystem();

  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [scratchContent, setScratchContent] = useState('');

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

        <Editor
          content={currentContent}
          viewMode={viewMode}
          theme={theme}
          onChange={handleContentChange}
          onInsertRef={insertRef}
          showFind={showFind}
          onCloseFind={() => setShowFind(false)}
        />
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
