import { useState, useRef, useCallback, useEffect } from 'react';
import { Icon } from '@iconify/react';
import type { ViewMode, FormatAction, FileEntry, ThemeId, AISettings } from '../types';
import { THEMES } from '../types';

import { useFileSystem } from '../hooks/useFileSystem';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { getAISettings, saveAISettings } from '../utils/aiSettings';
import { getSession, patchSession } from '../utils/sessionStorage';
import { Sidebar } from './Sidebar/Sidebar';
import { Toolbar } from './Toolbar/Toolbar';
import { Editor } from './Editor/Editor';
import { MarkdownPreview } from './Editor/MarkdownPreview';
import { CommandPalette } from './CommandPalette/CommandPalette';
import { ContextMenu } from './ContextMenu/ContextMenu';
import { SettingsDialog } from './SettingsDialog/SettingsDialog';
import { ClaudeChat } from './ClaudeChat/ClaudeChat';
import { UnsavedChangesDialog } from './UnsavedChangesDialog/UnsavedChangesDialog';

const VALID_THEMES = new Set(THEMES.map(t => t.id));

function getInitialTheme(): ThemeId {
  try {
    const saved = localStorage.getItem('markdown-editor-theme');
    // Migrate the former default ('ink') to the new Obsidian identity
    if (saved === 'ink') return 'obsidian';
    if (VALID_THEMES.has(saved as ThemeId)) return saved as ThemeId;
  } catch { /* ignore */ }
  return 'obsidian';
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
    sidebarSource,
    showFiles,
    showPlans,
    openPlanByPath,
    openedPlans,
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
  } = useFileSystem();

  // Use mock data if enabled, otherwise use real data
  const rootEntry = USE_MOCK_DATA ? MOCK_ROOT_ENTRY : realRootEntry;

  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [activeTheme, setActiveTheme] = useState<ThemeId>(getInitialTheme);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const MOCK_CONTENT = USE_MOCK_DATA ? `# Notas de Design

Um editor **minimalista** e _moderno_, inspirado no Obsidian.

## Hierarquia

O corpo usa Inter. Links como [este](https://obsidian.md) ficam sutis até o hover.

- [x] Fontes reais
- [ ] Polir contraste

\`\`\`ts
function saudar(nome: string): string {
  return \`Olá, \${nome}!\`;
}
\`\`\`

> Design não é só o que parece. É como funciona.
` : '';

  const [scratchContent, setScratchContent] = useState(() => {
    if (MOCK_CONTENT) return MOCK_CONTENT;
    return getSession()?.scratchContent ?? '';
  });
  const [requestNewFile, setRequestNewFile] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [aiSettings, setAISettings] = useState<AISettings>(getAISettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [closeRequestTabId, setCloseRequestTabId] = useState<string | null>(null);
  // Pending content to insert after a new file is created and opened
  const [pendingInsert, setPendingInsert] = useState<string | null>(null);
  // Prompt vindo do comando `/ia …` do editor — consumido pelo ClaudeChat
  const [aiPending, setAiPending] = useState<{ text: string; nonce: number } | null>(null);
  const aiNonceRef = useRef(0);

  // Apply theme to document root and persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
    localStorage.setItem('markdown-editor-theme', activeTheme);
  }, [activeTheme]);

  // Persist AI settings changes
  useEffect(() => {
    saveAISettings(aiSettings);
  }, [aiSettings]);

  // Hot exit — collect the current unsaved buffers (dirty tabs + scratch pad)
  const snapshotDrafts = useCallback(() => {
    const dirtyContent: Record<string, string> = {};
    for (const tab of tabs) {
      if (tab.isDirty) dirtyContent[tab.path] = tab.content;
    }
    patchSession({ dirtyContent, scratchContent });
  }, [tabs, scratchContent]);

  // Persist drafts periodically (debounced) so nothing is lost even on a crash/kill,
  // without ever writing to the file on disk (the ● marker stays until Ctrl+S).
  useEffect(() => {
    const timer = setTimeout(snapshotDrafts, 800);
    return () => clearTimeout(timer);
  }, [snapshotDrafts]);

  // Reinforce the snapshot right before the window closes
  useEffect(() => {
    window.addEventListener('beforeunload', snapshotDrafts);
    return () => window.removeEventListener('beforeunload', snapshotDrafts);
  }, [snapshotDrafts]);

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

  // Abrir plano recém-finalizado pelo Claude (disparado pelo hook via IPC)
  useEffect(() => {
    window.electronAPI?.onOpenPlan?.((filePath) => {
      openPlanByPath(filePath);
    });
    return () => window.electronAPI?.removeOpenPlanListeners?.();
  }, [openPlanByPath]);

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

  // Comando `/ia …`: abre o assistente e, se houver texto, agenda o envio (com contexto do arquivo).
  const handleAICommand = useCallback((prompt: string) => {
    setChatVisible(true);
    const text = prompt.trim();
    if (text) {
      aiNonceRef.current += 1;
      setAiPending({ text, nonce: aiNonceRef.current });
    }
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
        patchSession({ dirtyContent: rest });
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
        patchSession({ dirtyContent: rest });
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

  const toggleFocus = useCallback(() => {
    setFocusMode(prev => !prev);
  }, []);

  // Exit focus mode with Escape
  useEffect(() => {
    if (!focusMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFocusMode(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusMode]);

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
    onToggleFocus: toggleFocus,
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
      <Sidebar
        rootEntry={rootEntry}
        activeFilePath={activeTab?.path ?? null}
        collapsed={!sidebarVisible}
        source={sidebarSource}
        openedPlans={openedPlans}
        onShowFiles={showFiles}
        onShowPlans={showPlans}
        onOpenDirectory={openDirectory}
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
          settingsOpen={settingsOpen}
          onToggleSettings={() => setSettingsOpen(prev => !prev)}
          onFind={() => setShowFind(true)}
          chatVisible={chatVisible}
          onToggleChat={toggleChat}
          showCodeDialog={showCodeDialog}
          showTableDialog={showTableDialog}
          aiSettings={aiSettings}
          onShowCodeDialog={setShowCodeDialog}
          onShowTableDialog={setShowTableDialog}
          sidebarVisible={sidebarVisible}
          onToggleSidebar={toggleSidebar}
        />

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Editor or empty state */}
          <div style={{ position: 'relative', flex: 1, overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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
                      boxShadow: '0 8px 32px rgba(124, 108, 247, 0.28)',
                    }}>
                      <Icon icon="codicon:markdown" width={40} style={{ color: 'var(--accent-contrast)' }} />
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
                        color: 'var(--accent-contrast)',
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 16px rgba(124, 108, 247, 0.3)',
                        border: 'none',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 24px rgba(124, 108, 247, 0.42)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(124, 108, 247, 0.3)';
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
                onSlashTable={() => setShowTableDialog(true)}
                onSlashCode={() => setShowCodeDialog(true)}
                onSlashAI={handleAICommand}
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
            onInsertText={handleInsertText}
            pendingPrompt={aiPending}
            onPromptConsumed={() => setAiPending(null)}
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

      {/* Focus / reading mode (F11) */}
      {focusMode && (
        <div className="reading-shell">
          <button className="reading-exit" onClick={() => setFocusMode(false)} title="Sair do modo foco">
            <Icon icon="codicon:screen-normal" width={13} />
            Sair <kbd>Esc</kbd>
          </button>
          <MarkdownPreview source={currentContent} />
        </div>
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
