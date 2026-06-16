import { useState, useRef, useCallback, useEffect } from 'react';
import { Icon } from '@iconify/react';
import type { ViewMode, FormatAction, FileEntry, ThemeId, AISettings } from '../types';
import { THEMES } from '../types';

import { useFileSystem } from '../hooks/useFileSystem';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { getAISettings, saveAISettings } from '../utils/aiSettings';
import { getSession, saveSession } from '../utils/sessionStorage';
import { ActivityBar } from './ActivityBar/ActivityBar';
import { Sidebar } from './Sidebar/Sidebar';
import { Toolbar } from './Toolbar/Toolbar';
import { Editor } from './Editor/Editor';
import { CommandPalette } from './CommandPalette/CommandPalette';
import { ContextMenu } from './ContextMenu/ContextMenu';
import { SettingsDialog } from './SettingsDialog/SettingsDialog';
import { ClaudeChat } from './ClaudeChat/ClaudeChat';
import { UnsavedChangesDialog } from './UnsavedChangesDialog/UnsavedChangesDialog';

const VALID_THEMES = new Set(THEMES.map(t => t.id));

function getInitialTheme(): ThemeId {
  try {
    const saved = localStorage.getItem('markdown-editor-theme') as ThemeId;
    if (VALID_THEMES.has(saved)) return saved;
  } catch { /* ignore */ }
  return 'matte-black';
}

// ── Mock data for development/preview ──
const MOCK_ROOT_ENTRY: FileEntry = {
  name: 'my-project',
  path: '/mock/my-project',
  isDirectory: true,
  children: [
    {
      name: 'docs',
      path: '/mock/my-project/docs',
      isDirectory: true,
      children: [
        { name: 'getting-started.md', path: '/mock/my-project/docs/getting-started.md', isDirectory: false },
        { name: 'api-reference.md', path: '/mock/my-project/docs/api-reference.md', isDirectory: false },
        { name: 'changelog.md', path: '/mock/my-project/docs/changelog.md', isDirectory: false },
      ],
    },
    {
      name: 'notes',
      path: '/mock/my-project/notes',
      isDirectory: true,
      children: [
        { name: 'ideas.md', path: '/mock/my-project/notes/ideas.md', isDirectory: false },
        { name: 'todo.md', path: '/mock/my-project/notes/todo.md', isDirectory: false },
      ],
    },
    { name: 'README.md', path: '/mock/my-project/README.md', isDirectory: false },
    { name: 'CONTRIBUTING.md', path: '/mock/my-project/CONTRIBUTING.md', isDirectory: false },
    { name: 'LICENSE', path: '/mock/my-project/LICENSE', isDirectory: false },
  ],
};

// Set to true to preview with mock data (for layout testing)
const USE_MOCK_DATA = false;

export function App() {
  const {
    rootEntry: realRootEntry,
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
    renameFile,
    deleteFile,
    createDirectory,
    renameDirectory,
    deleteDirectory,
    refreshTree,
    moveFile,
    openClaudePlans,
  } = useFileSystem();

  // Use mock data if enabled, otherwise use real data
  const rootEntry = USE_MOCK_DATA ? MOCK_ROOT_ENTRY : realRootEntry;

  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [activeTheme, setActiveTheme] = useState<ThemeId>(getInitialTheme);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const MOCK_CONTENT = USE_MOCK_DATA ? `# Teste Mermaid

\`\`\`mermaid
mindmap
  root((Projetos))
    Frontend
      React
      Vue
      Angular
    Backend
      Node.js
      Python
      Java
    Mobile
      React Native
      Flutter
\`\`\`

Esse é um teste de diagrama mermaid.
` : '';

  const [scratchContent, setScratchContent] = useState(MOCK_CONTENT);
  const [requestNewFile, setRequestNewFile] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [aiSettings, setAISettings] = useState<AISettings>(getAISettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [closeRequestTabId, setCloseRequestTabId] = useState<string | null>(null);
  // Pending content to insert after a new file is created and opened
  const [pendingInsert, setPendingInsert] = useState<string | null>(null);

  // Apply theme to document root and persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
    localStorage.setItem('markdown-editor-theme', activeTheme);
  }, [activeTheme]);

  // Persist AI settings changes
  useEffect(() => {
    saveAISettings(aiSettings);
  }, [aiSettings]);

  // Hot exit: persist unsaved content before the window closes
  useEffect(() => {
    const handleBeforeUnload = () => {
      const dirtyContent: Record<string, string> = {};
      for (const tab of tabs) {
        if (tab.isDirty) dirtyContent[tab.path] = tab.content;
      }
      const existing = getSession();
      if (existing) saveSession({ ...existing, dirtyContent });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [tabs]);

  // Auto-refresh file tree when window gains focus (to detect external file changes)
  useEffect(() => {
    const handleFocus = () => {
      if (rootEntry) {
        refreshTree();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [rootEntry, refreshTree]);

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

  const handleTabCloseRequest = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.isDirty) {
      setCloseRequestTabId(tabId);
    } else {
      closeTab(tabId);
    }
  }, [tabs, closeTab]);

  const handleUnsavedSave = useCallback(async () => {
    if (!closeRequestTabId) return;
    const tab = tabs.find(t => t.id === closeRequestTabId);
    await saveFile(closeRequestTabId);
    if (tab) {
      const session = getSession();
      if (session?.dirtyContent) {
        const { [tab.path]: _, ...rest } = session.dirtyContent;
        saveSession({ ...session, dirtyContent: rest });
      }
    }
    closeTab(closeRequestTabId);
    setCloseRequestTabId(null);
  }, [closeRequestTabId, tabs, saveFile, closeTab]);

  const handleUnsavedDiscard = useCallback(() => {
    if (!closeRequestTabId) return;
    const tab = tabs.find(t => t.id === closeRequestTabId);
    if (tab) {
      const session = getSession();
      if (session?.dirtyContent) {
        const { [tab.path]: _, ...rest } = session.dirtyContent;
        saveSession({ ...session, dirtyContent: rest });
      }
    }
    closeTab(closeRequestTabId);
    setCloseRequestTabId(null);
  }, [closeRequestTabId, tabs, closeTab]);

  const toggleSidebar = useCallback(() => {
    setSidebarVisible(prev => !prev);
  }, []);

  const toggleChat = useCallback(() => {
    setChatVisible(prev => !prev);
  }, []);

  // When a pending insert is queued and the active tab changes, set the tab content directly
  useEffect(() => {
    if (pendingInsert !== null && activeTab) {
      updateContent(activeTab.id, pendingInsert);
      setPendingInsert(null);
    }
  }, [activeTab?.id, pendingInsert, updateContent]);

  useKeyboardShortcuts({
    onSave: handleSave,
    onCommandPalette: () => setShowCommandPalette(true),
    onFind: () => setShowFind(true),
    onNewFile: () => {
      if (rootEntry) {
        setSidebarVisible(true);
        setRequestNewFile(true);
      }
    },
    onTogglePreview: () => {
      setViewMode(prev => prev === 'editor' ? 'preview' : 'editor');
    },
    onToggleSidebar: toggleSidebar,
    onToggleChat: toggleChat,
    onFormatBold: () => handleFormat('bold'),
    onFormatItalic: () => handleFormat('italic'),
    onFormatStrikethrough: () => handleFormat('strikethrough'),
    onFormatUnderline: () => {
      const editorApplyFormat = (window as unknown as Record<string, unknown>).__editorApplyFormat as ((prefix: string, suffix: string) => void) | undefined;
      editorApplyFormat?.('<u>', '</u>');
    },
    onFormatLink: () => {
      const editorApplyFormat = (window as unknown as Record<string, unknown>).__editorApplyFormat as ((prefix: string, suffix: string) => void) | undefined;
      editorApplyFormat?.('[', '](url)');
    },
    onInsertOrderedList: () => handleInsertText('1. '),
    onInsertBulletedList: () => handleInsertText('- '),
    onInsertBlockquote: () => handleInsertText('> '),
    onOpenCodeDialog: () => setShowCodeDialog(true),
    onOpenTableDialog: () => setShowTableDialog(true),
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

  const showEmptyState = !activeTab && tabs.length === 0 && !USE_MOCK_DATA;

  return (
    <div
      style={{ display: 'flex', height: '100vh', width: '100vw' }}
      onContextMenu={handleContextMenu}
    >
      <ActivityBar
        sidebarVisible={sidebarVisible}
        settingsOpen={settingsOpen}
        onToggleSidebar={() => { setSettingsOpen(false); toggleSidebar(); }}
        onOpenSettings={() => setSettingsOpen(prev => !prev)}
      />

      <Sidebar
        rootEntry={rootEntry}
        activeFilePath={activeTab?.path ?? null}
        collapsed={!sidebarVisible}
        onOpenDirectory={openDirectory}
        onOpenClaudePlans={openClaudePlans}
        onFileSelect={openFile}
        onCreateFile={createFile}
        onRenameFile={renameFile}
        onDeleteFile={deleteFile}
        onCreateDirectory={createDirectory}
        onRenameDirectory={renameDirectory}
        onDeleteDirectory={deleteDirectory}
        onRefresh={refreshTree}
        onMoveFile={moveFile}
        requestNewFile={requestNewFile}
        onNewFileDialogDone={() => setRequestNewFile(false)}
      />

      {settingsOpen && (
        <SettingsDialog
          activeTheme={activeTheme}
          onThemeChange={setActiveTheme}
          aiSettings={aiSettings}
          onAISettingsChange={setAISettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Toolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onInsertText={handleInsertText}
          tabs={tabs}
          activeTabId={activeTabId}
          onTabSelect={setActiveTabId}
          onTabClose={handleTabCloseRequest}
          onFind={() => setShowFind(true)}
          chatVisible={chatVisible}
          onToggleChat={toggleChat}
          showCodeDialog={showCodeDialog}
          showTableDialog={showTableDialog}
          aiSettings={aiSettings}
          onShowCodeDialog={setShowCodeDialog}
          onShowTableDialog={setShowTableDialog}
        />

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Editor or empty state */}
          <div style={{ flex: 1, overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {showEmptyState ? (
              rootEntry ? (
                // Simplified empty state when folder is open
                <div style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  color: 'var(--text-muted)',
                  userSelect: 'none',
                  padding: '40px',
                }}>
                  <Icon icon="codicon:file" width={48} style={{ opacity: 0.3 }} />
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                    Select a file from the sidebar
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                    or press <kbd style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                    }}>Ctrl+N</kbd> to create a new file
                  </p>
                </div>
              ) : (
                // Full welcome screen when no folder is open
                <div style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 32,
                  color: 'var(--text-muted)',
                  userSelect: 'none',
                  padding: '40px',
                }}>
                  {/* Logo */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 12,
                    animation: 'fadeIn 0.5s ease-out',
                  }}>
                    <div style={{
                      width: 80,
                      height: 80,
                      borderRadius: 20,
                      background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-hover) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 32px rgba(232, 168, 56, 0.2)',
                    }}>
                      <Icon icon="codicon:markdown" width={40} style={{ color: 'var(--bg-primary)' }} />
                    </div>
                    <h1 style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.02em',
                      margin: 0,
                    }}>
                      Markdown Editor
                    </h1>
                    <p style={{
                      fontSize: 14,
                      color: 'var(--text-secondary)',
                      margin: 0,
                      letterSpacing: '0.01em',
                    }}>
                      A minimal Markdown editor
                    </p>
                  </div>

                  {/* Quick Actions */}
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      onClick={openDirectory}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '14px 28px',
                        background: 'var(--accent-primary)',
                        color: 'var(--bg-primary)',
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 16px rgba(232, 168, 56, 0.25)',
                        border: 'none',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 24px rgba(232, 168, 56, 0.35)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(232, 168, 56, 0.25)';
                      }}
                    >
                      <Icon icon="codicon:folder-opened" width={18} />
                      Open Folder
                    </button>
                  </div>

                  {/* Keyboard Shortcuts */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px 32px',
                    marginTop: 16,
                    padding: '24px 32px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 12,
                    border: '1px solid var(--border-color)',
                  }}>
                    {[
                      { key: 'Ctrl+P', desc: 'Quick Open' },
                      { key: 'Ctrl+S', desc: 'Save File' },
                      { key: 'Ctrl+N', desc: 'New File' },
                      { key: 'Ctrl+F', desc: 'Find & Replace' },
                      { key: 'Ctrl+Shift+C', desc: 'Claude Chat' },
                    ].map(({ key, desc }) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <kbd style={{
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 6,
                          padding: '4px 10px',
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}>{key}</kbd>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <Editor
                content={currentContent}
                viewMode={viewMode}
                activeTheme={activeTheme}
                onChange={handleContentChange}
                onInsertRef={insertRef}
                showFind={showFind}
                onCloseFind={() => setShowFind(false)}
              />
            )}
          </div>

          {/* Claude Chat sidebar */}
          <ClaudeChat
            visible={chatVisible}
            onClose={() => setChatVisible(false)}
            activeContent={currentContent}
            activeFileName={activeTab?.name ?? (USE_MOCK_DATA ? 'README.md' : '')}
            workspacePath={rootEntry?.path}
            aiSettings={aiSettings}
          />
        </div>
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

      {/* Unsaved Changes Dialog */}
      {closeRequestTabId && (() => {
        const tab = tabs.find(t => t.id === closeRequestTabId);
        return tab ? (
          <UnsavedChangesDialog
            fileName={tab.name}
            onSave={handleUnsavedSave}
            onDiscard={handleUnsavedDiscard}
            onCancel={() => setCloseRequestTabId(null)}
          />
        ) : null;
      })()}
    </div>
  );
}
