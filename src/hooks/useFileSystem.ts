import { useState, useCallback, useRef, useEffect } from 'react';
import type { FileEntry, EditorTab } from '../types';
import {
  isElectron,
  openDirectory,
  reopenDirectoryByPath,
  readFileContent,
  writeFileContent,
  findFileByPath,
  getInitialWorkspace,
  createNewFile,
  refreshDirectoryTree,
} from '../utils/fileSystem';
import { saveSession, getSession, clearSession } from '../utils/sessionStorage';

export function useFileSystem() {
  const [rootEntry, setRootEntry] = useState<FileEntry | null>(null);
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // Ref always points to latest tabs — used in callbacks to avoid stale closures
  const tabsRef = useRef<EditorTab[]>([]);
  tabsRef.current = tabs;

  // Track root directory path for Electron persistence
  const rootPathRef = useRef<string | null>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) ?? null;

  // ── Persist session on tab changes ──
  useEffect(() => {
    if (isRestoring) return;

    const activePath = tabs.find(t => t.id === activeTabId)?.path ?? null;
    saveSession({
      directoryPath: rootPathRef.current,
      openTabPaths: tabs.map(t => t.path),
      activeTabPath: activePath,
    });
  }, [tabs, activeTabId, isRestoring]);

  // ── Restore session on mount ──
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        // Priority 1: CLI argument (Docker / --workspace flag)
        if (isElectron()) {
          const cliWorkspace = await getInitialWorkspace();
          if (cliWorkspace && !cancelled) {
            const entry = await reopenDirectoryByPath(cliWorkspace);
            if (entry && !cancelled) {
              rootPathRef.current = cliWorkspace;
              setRootEntry(entry);
              setIsRestoring(false);
              return;
            }
          }
        }

        // Priority 2: Restore from session storage
        const session = getSession();
        if (!session?.directoryPath || cancelled) {
          setIsRestoring(false);
          return;
        }

        if (isElectron()) {
          const entry = await reopenDirectoryByPath(session.directoryPath);
          if (!entry || cancelled) {
            clearSession();
            setIsRestoring(false);
            return;
          }

          rootPathRef.current = session.directoryPath;
          setRootEntry(entry);

          await restoreTabs(entry, session.openTabPaths, session.activeTabPath, cancelled);
        }
        // Browser fallback: can't reliably restore without handle permissions
      } catch {
        clearSession();
      }
      if (!cancelled) setIsRestoring(false);
    }

    async function restoreTabs(
      entry: FileEntry,
      tabPaths: string[],
      activeTabPath: string | null,
      isCancelled: boolean,
    ) {
      if (tabPaths.length === 0) return;

      const restoredTabs: EditorTab[] = [];
      let activeRestoredPath: string | null = null;

      for (const tabPath of tabPaths) {
        const fileEntry = findFileByPath(entry, tabPath);
        if (!fileEntry || fileEntry.isDirectory) continue;

        try {
          const content = await readFileContent(fileEntry);
          restoredTabs.push({
            id: crypto.randomUUID(),
            name: fileEntry.name,
            path: fileEntry.path,
            content,
            handle: fileEntry.handle as FileSystemFileHandle | undefined,
            isDirty: false,
          });

          if (tabPath === activeTabPath) {
            activeRestoredPath = tabPath;
          }
        } catch {
          // File might have been deleted — skip
        }
      }

      if (isCancelled || restoredTabs.length === 0) return;

      setTabs(restoredTabs);

      const active = activeRestoredPath
        ? restoredTabs.find(t => t.path === activeRestoredPath)
        : restoredTabs[0];
      if (active) {
        setActiveTabId(active.id);
      }
    }

    restore();

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Directory picker ──
  const handleOpenDirectory = useCallback(async () => {
    const entry = await openDirectory();
    if (entry) {
      setRootEntry(entry);
      rootPathRef.current = entry.path;
    }
  }, []);

  const handleOpenFile = useCallback(async (entry: FileEntry) => {
    if (entry.isDirectory) return;
    // In browser we need a handle; in Electron we use the path
    if (!entry.handle && !isElectron()) return;

    const existing = tabsRef.current.find(t => t.path === entry.path);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    const content = await readFileContent(entry);
    const newTab: EditorTab = {
      id: crypto.randomUUID(),
      name: entry.name,
      path: entry.path,
      content,
      handle: entry.handle as FileSystemFileHandle | undefined,
      isDirty: false,
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  const handleCloseTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === tabId);
      const next = prev.filter(t => t.id !== tabId);

      if (tabId === activeTabId && next.length > 0) {
        const newIdx = Math.min(idx, next.length - 1);
        setActiveTabId(next[newIdx].id);
      } else if (next.length === 0) {
        setActiveTabId(null);
      }

      return next;
    });
  }, [activeTabId]);

  const handleUpdateContent = useCallback((tabId: string, content: string) => {
    setTabs(prev =>
      prev.map(t =>
        t.id === tabId ? { ...t, content, isDirty: true } : t
      )
    );
  }, []);

  const handleSaveFile = useCallback(async (tabId: string) => {
    const tab = tabsRef.current.find(t => t.id === tabId);
    if (!tab) return;

    // writeFileContent handles both Electron (path) and browser (handle)
    await writeFileContent(tab);
    setTabs(prev =>
      prev.map(t =>
        t.id === tabId ? { ...t, isDirty: false } : t
      )
    );
  }, []);

  const handleCreateFile = useCallback(async (dirPath: string, fileName: string) => {
    const root = rootEntry;
    if (!root) return;

    // Find the target directory in the tree
    const targetDir = dirPath === root.path
      ? root
      : findDirByPath(root, dirPath);
    if (!targetDir) return;

    // Create the file on disk
    const { filePath, handle } = await createNewFile(targetDir, fileName);

    // Refresh the directory tree
    const refreshed = await refreshDirectoryTree(root);
    if (refreshed) {
      setRootEntry(refreshed);
      rootPathRef.current = refreshed.path;

      // Find the new file and open it
      const newFileEntry = findFileByPath(refreshed, filePath);
      if (newFileEntry) {
        // If browser mode, attach the handle we got from createNewFile
        if (handle && !newFileEntry.handle) {
          newFileEntry.handle = handle;
        }
        handleOpenFile(newFileEntry);
      }
    }
  }, [rootEntry, handleOpenFile]);

  return {
    rootEntry,
    tabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    openDirectory: handleOpenDirectory,
    openFile: handleOpenFile,
    closeTab: handleCloseTab,
    updateContent: handleUpdateContent,
    saveFile: handleSaveFile,
    createFile: handleCreateFile,
  };
}

function findDirByPath(entry: FileEntry, targetPath: string): FileEntry | null {
  if (entry.isDirectory && entry.path === targetPath) return entry;
  if (entry.children) {
    for (const child of entry.children) {
      const found = findDirByPath(child, targetPath);
      if (found) return found;
    }
  }
  return null;
}
