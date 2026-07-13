import { useState, useCallback, useRef, useEffect } from 'react';
import type { FileEntry, EditorTab } from '../types';
import {
  isElectron,
  openDirectory,
  openDirectoryByPath,
  reopenDirectoryByPath,
  readFileContent,
  readFileByPath,
  writeFileContent,
  findFileByPath,
  getInitialWorkspace,
  getHomeDir,
  createNewFile,
  createNewDirectory,
  renameFile,
  deleteFile,
  renameDirectory,
  deleteDirectory,
  refreshDirectoryTree,
  moveFile,
} from '../utils/fileSystem';
import { patchSession, getSession, clearSession } from '../utils/sessionStorage';

export type SidebarSource = 'files' | 'plans';

export function useFileSystem() {
  const [filesRoot, setFilesRoot] = useState<FileEntry | null>(null);
  const [plansRoot, setPlansRoot] = useState<FileEntry | null>(null);
  const [sidebarSource, setSidebarSource] = useState<SidebarSource>('files');
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [openedPlans, setOpenedPlans] = useState<string[]>([]);
  const [isRestoring, setIsRestoring] = useState(true);

  // Ref always points to latest tabs — used in callbacks to avoid stale closures
  const tabsRef = useRef<EditorTab[]>([]);
  tabsRef.current = tabs;

  // Track root directory paths for persistence (independent per source)
  const filesPathRef = useRef<string | null>(null);
  const plansPathRef = useRef<string | null>(null);

  // Which source is active, mirrored in a ref for stable callbacks
  const sourceRef = useRef<SidebarSource>(sidebarSource);
  sourceRef.current = sidebarSource;

  // True while a directory picker / plans load is in flight — suppresses the
  // focus-triggered refresh that would otherwise revert a freshly opened folder.
  const isOpeningRef = useRef(false);

  const rootEntry = sidebarSource === 'files' ? filesRoot : plansRoot;
  const activeRootRef = useRef<FileEntry | null>(null);
  activeRootRef.current = rootEntry;

  // Mirror do plansRoot em ref — usado no listener de "abrir plano" (evita closure velha)
  const plansRootRef = useRef<FileEntry | null>(null);
  plansRootRef.current = plansRoot;

  const activeTab = tabs.find(t => t.id === activeTabId) ?? null;

  // Write the given entry back into whichever root is currently active.
  const applyActiveRoot = useCallback((entry: FileEntry | null) => {
    if (sourceRef.current === 'files') {
      setFilesRoot(entry);
      filesPathRef.current = entry?.path ?? null;
    } else {
      setPlansRoot(entry);
      plansPathRef.current = entry?.path ?? null;
    }
  }, []);

  // ── Persist session on tab / source changes ──
  useEffect(() => {
    if (isRestoring) return;

    const activePath = tabs.find(t => t.id === activeTabId)?.path ?? null;
    patchSession({
      directoryPath: filesPathRef.current,
      openTabPaths: tabs.map(t => t.path),
      activeTabPath: activePath,
      sidebarSource,
      openedPlans,
    });
  }, [tabs, activeTabId, sidebarSource, openedPlans, isRestoring]);

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
              filesPathRef.current = cliWorkspace;
              setFilesRoot(entry);
              setIsRestoring(false);
              return;
            }
          }
        }

        // Priority 2: Restore from session storage
        const session = getSession();
        if (!session || cancelled) {
          setIsRestoring(false);
          return;
        }

        if (session.openedPlans) setOpenedPlans(session.openedPlans);

        if (isElectron()) {
          // Restore the user's files folder (if any)
          if (session.directoryPath) {
            const entry = await reopenDirectoryByPath(session.directoryPath);
            if (entry && !cancelled) {
              filesPathRef.current = session.directoryPath;
              setFilesRoot(entry);
            }
          }

          // Restore open tabs by reading their paths directly (root-independent)
          await restoreTabs(session.openTabPaths, session.activeTabPath, session.dirtyContent ?? {}, cancelled);

          // Restore the active sidebar source (lazily loads plans if needed)
          if (session.sidebarSource === 'plans' && !cancelled) {
            setSidebarSource('plans');
            const plans = await loadPlansRoot();
            if (plans && !cancelled) { /* loaded */ }
          }
        }
        // Browser fallback: can't reliably restore without handle permissions
      } catch {
        clearSession();
      }
      if (!cancelled) setIsRestoring(false);
    }

    async function restoreTabs(
      tabPaths: string[],
      activeTabPath: string | null,
      dirtyContent: Record<string, string>,
      isCancelled: boolean,
    ) {
      if (tabPaths.length === 0) return;

      const restoredTabs: EditorTab[] = [];
      let activeRestoredPath: string | null = null;

      for (const tabPath of tabPaths) {
        try {
          const savedDirty = dirtyContent[tabPath];
          // In Electron we can read straight from the path, so tabs from either
          // source (files or plans) survive a restart.
          const content = savedDirty ?? await readFileByPath(tabPath);
          const name = tabPath.substring(tabPath.lastIndexOf('/') + 1);
          restoredTabs.push({
            id: crypto.randomUUID(),
            name,
            path: tabPath,
            content,
            handle: undefined,
            isDirty: savedDirty !== undefined,
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

  // ── Load ~/.claude/plans into the plans root ──
  const loadPlansRoot = useCallback(async (): Promise<FileEntry | null> => {
    const home = await getHomeDir();
    if (!home) return null;
    const entry = await openDirectoryByPath(`${home}/.claude/plans`);
    if (entry) {
      setPlansRoot(entry);
      plansPathRef.current = entry.path;
    }
    return entry;
  }, []);

  // ── Abrir um plano por caminho (disparado pelo hook via IPC 'plan:open') ──
  const openPlanByPath = useCallback(async (filePath: string) => {
    setSidebarSource('plans');

    // O arquivo é recém-criado: garante o plansRoot atualizado ANTES de procurar.
    let root = plansRootRef.current;
    if (!root) {
      root = await loadPlansRoot();
    } else {
      const refreshed = await refreshDirectoryTree(root);
      if (refreshed) {
        setPlansRoot(refreshed);
        plansPathRef.current = refreshed.path;
        plansRootRef.current = refreshed;
        root = refreshed;
      }
    }
    if (!root) return;

    const entry = findFileByPath(root, filePath);
    if (entry) handleOpenFile(entry);
  }, [loadPlansRoot]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sidebar source switching ──
  const showFiles = useCallback(() => setSidebarSource('files'), []);

  const showPlans = useCallback(async () => {
    setSidebarSource('plans');
    if (!plansPathRef.current) {
      isOpeningRef.current = true;
      try {
        await loadPlansRoot();
      } finally {
        isOpeningRef.current = false;
      }
    }
  }, [loadPlansRoot]);

  // ── Directory picker (user's Files folder) ──
  const handleOpenDirectory = useCallback(async () => {
    isOpeningRef.current = true;
    try {
      const entry = await openDirectory();
      if (entry) {
        setFilesRoot(entry);
        filesPathRef.current = entry.path;
        setSidebarSource('files');
        // Persiste a pasta recém-selecionada na hora. O efeito de sessão só reage a
        // mudanças de estado (tabs/source); uma troca de pasta que não altera outro
        // estado nunca seria gravada, fazendo o app reabrir a pasta anterior no restart.
        patchSession({ directoryPath: entry.path });
      }
    } finally {
      isOpeningRef.current = false;
    }
  }, []);

  const handleOpenFile = useCallback(async (entry: FileEntry) => {
    if (entry.isDirectory) return;
    // In browser we need a handle; in Electron we use the path
    if (!entry.handle && !isElectron()) return;

    // Mark Claude Plans as "seen" so its "new" badge clears
    if (plansPathRef.current && entry.path.startsWith(plansPathRef.current + '/')) {
      setOpenedPlans(prev => prev.includes(entry.path) ? prev : [...prev, entry.path]);
    }

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
    const root = activeRootRef.current;
    if (!root) return;

    const targetDir = dirPath === root.path
      ? root
      : findDirByPath(root, dirPath);
    if (!targetDir) return;

    const { filePath, handle } = await createNewFile(targetDir, fileName);

    const refreshed = await refreshDirectoryTree(root);
    if (refreshed) {
      applyActiveRoot(refreshed);

      const newFileEntry = findFileByPath(refreshed, filePath);
      if (newFileEntry) {
        if (handle && !newFileEntry.handle) {
          newFileEntry.handle = handle;
        }
        handleOpenFile(newFileEntry);
      }
    }
  }, [applyActiveRoot, handleOpenFile]);

  const handleRenameFile = useCallback(async (oldPath: string, newName: string) => {
    const root = activeRootRef.current;
    if (!root) return;

    const fileEntry = findFileByPath(root, oldPath);
    if (!fileEntry) return;

    const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const parentDir = parentPath === root.path
      ? root
      : findDirByPath(root, parentPath);

    const newPath = await renameFile(fileEntry, newName, parentDir ?? undefined);

    setTabs(prev =>
      prev.map(t =>
        t.path === oldPath
          ? { ...t, name: newName, path: newPath, handle: undefined }
          : t
      )
    );

    const refreshed = await refreshDirectoryTree(root);
    if (refreshed) {
      applyActiveRoot(refreshed);

      const tab = tabsRef.current.find(t => t.path === newPath);
      if (tab && !tab.handle) {
        const newFileEntry = findFileByPath(refreshed, newPath);
        if (newFileEntry?.handle) {
          setTabs(prev =>
            prev.map(t =>
              t.path === newPath
                ? { ...t, handle: newFileEntry.handle as FileSystemFileHandle }
                : t
            )
          );
        }
      }
    }
  }, [applyActiveRoot]);

  const handleDeleteFile = useCallback(async (filePath: string) => {
    const root = activeRootRef.current;
    if (!root) return;

    const fileEntry = findFileByPath(root, filePath);
    if (!fileEntry) return;

    const parentPath = filePath.substring(0, filePath.lastIndexOf('/'));
    const parentDir = parentPath === root.path
      ? root
      : findDirByPath(root, parentPath);

    await deleteFile(fileEntry, parentDir ?? undefined);

    const openTab = tabsRef.current.find(t => t.path === filePath);
    if (openTab) {
      setTabs(prev => {
        const idx = prev.findIndex(t => t.id === openTab.id);
        const next = prev.filter(t => t.id !== openTab.id);

        if (openTab.id === activeTabId && next.length > 0) {
          const newIdx = Math.min(idx, next.length - 1);
          setActiveTabId(next[newIdx].id);
        } else if (next.length === 0) {
          setActiveTabId(null);
        }

        return next;
      });
    }

    const refreshed = await refreshDirectoryTree(root);
    if (refreshed) {
      applyActiveRoot(refreshed);
    }
  }, [applyActiveRoot, activeTabId]);

  const handleCreateDirectory = useCallback(async (dirPath: string, folderName: string) => {
    const root = activeRootRef.current;
    if (!root) return;

    const targetDir = dirPath === root.path
      ? root
      : findDirByPath(root, dirPath);
    if (!targetDir) return;

    await createNewDirectory(targetDir, folderName);

    const refreshed = await refreshDirectoryTree(root);
    if (refreshed) {
      applyActiveRoot(refreshed);
    }
  }, [applyActiveRoot]);

  const handleRenameDirectory = useCallback(async (oldPath: string, newName: string) => {
    const root = activeRootRef.current;
    if (!root) return;

    const dirEntry = findDirByPath(root, oldPath);
    if (!dirEntry) return;

    const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const parentDir = parentPath === root.path
      ? root
      : findDirByPath(root, parentPath);

    const newPath = await renameDirectory(dirEntry, newName, parentDir ?? undefined);

    setTabs(prev =>
      prev.map(t =>
        t.path.startsWith(oldPath + '/')
          ? { ...t, path: t.path.replace(oldPath, newPath), handle: undefined }
          : t
      )
    );

    const refreshed = await refreshDirectoryTree(root);
    if (refreshed) {
      applyActiveRoot(refreshed);
    }
  }, [applyActiveRoot]);

  const handleDeleteDirectory = useCallback(async (dirPath: string) => {
    const root = activeRootRef.current;
    if (!root) return;

    const dirEntry = findDirByPath(root, dirPath);
    if (!dirEntry) return;

    const parentPath = dirPath.substring(0, dirPath.lastIndexOf('/'));
    const parentDir = parentPath === root.path
      ? root
      : findDirByPath(root, parentPath);

    await deleteDirectory(dirEntry, parentDir ?? undefined);

    setTabs(prev => {
      const remaining = prev.filter(t => !t.path.startsWith(dirPath + '/'));
      if (remaining.length === 0) {
        setActiveTabId(null);
      } else if (!remaining.find(t => t.id === activeTabId)) {
        setActiveTabId(remaining[remaining.length - 1].id);
      }
      return remaining;
    });

    const refreshed = await refreshDirectoryTree(root);
    if (refreshed) {
      applyActiveRoot(refreshed);
    }
  }, [applyActiveRoot, activeTabId]);

  const handleRefresh = useCallback(async () => {
    // Guard against the focus-refresh race that reverts a freshly opened folder
    if (isOpeningRef.current) return;
    const root = activeRootRef.current;
    if (!root) return;

    const refreshed = await refreshDirectoryTree(root);
    if (refreshed) {
      applyActiveRoot(refreshed);
    }
  }, [applyActiveRoot]);

  const handleMoveFile = useCallback(async (filePath: string, targetDirPath: string) => {
    const root = activeRootRef.current;
    if (!root) return;

    const fileEntry = findFileByPath(root, filePath);
    const targetDirEntry = findDirByPath(root, targetDirPath);
    if (!fileEntry || !targetDirEntry) return;

    const currentDirPath = filePath.substring(0, filePath.lastIndexOf('/'));
    if (currentDirPath === targetDirPath) return;

    const newPath = await moveFile(fileEntry, targetDirEntry);

    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
    setTabs(prev =>
      prev.map(t =>
        t.path === filePath
          ? { ...t, path: newPath, name: fileName }
          : t
      )
    );

    const refreshed = await refreshDirectoryTree(root);
    if (refreshed) {
      applyActiveRoot(refreshed);
    }
  }, [applyActiveRoot]);

  return {
    rootEntry,
    filesRoot,
    plansRoot,
    sidebarSource,
    showFiles,
    showPlans,
    openPlanByPath,
    openedPlans,
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
    renameFile: handleRenameFile,
    deleteFile: handleDeleteFile,
    createDirectory: handleCreateDirectory,
    renameDirectory: handleRenameDirectory,
    deleteDirectory: handleDeleteDirectory,
    refreshTree: handleRefresh,
    moveFile: handleMoveFile,
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
