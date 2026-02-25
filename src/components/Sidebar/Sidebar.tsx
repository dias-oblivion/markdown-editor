import { useState, useCallback, useEffect } from 'react';
import { Icon } from '@iconify/react';
import type { FileEntry } from '../../types';
import { FileTree } from './FileTree';
import { NewFileDialog } from './NewFileDialog';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import styles from './Sidebar.module.css';

interface SidebarProps {
  rootEntry: FileEntry | null;
  activeFilePath: string | null;
  collapsed?: boolean;
  onOpenDirectory: () => void;
  onFileSelect: (entry: FileEntry) => void;
  onCreateFile: (dirPath: string, fileName: string) => Promise<void>;
  onRenameFile: (oldPath: string, newName: string) => Promise<void>;
  onDeleteFile: (filePath: string) => Promise<void>;
  onCreateDirectory: (dirPath: string, folderName: string) => Promise<void>;
  onRenameDirectory: (oldPath: string, newName: string) => Promise<void>;
  onDeleteDirectory: (dirPath: string) => Promise<void>;
  onRefresh: () => void;
  requestNewFile?: boolean;
  onNewFileDialogDone?: () => void;
}

export function Sidebar({ rootEntry, activeFilePath, collapsed, onOpenDirectory, onFileSelect, onCreateFile, onRenameFile, onDeleteFile, onCreateDirectory, onRenameDirectory, onDeleteDirectory, onRefresh, requestNewFile, onNewFileDialogDone }: SidebarProps) {
  const [newFileDialog, setNewFileDialog] = useState<{ dirPath: string } | null>(null);
  const [newFolderDialog, setNewFolderDialog] = useState<{ dirPath: string } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; dirPath: string; fileEntry?: FileEntry; isDirTarget?: boolean } | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ path: string; name: string; isDirectory?: boolean } | null>(null);
  const [renameDirDialog, setRenameDirDialog] = useState<{ dirPath: string; currentName: string } | null>(null);

  // Open dialog when parent requests it (e.g. Ctrl+N)
  useEffect(() => {
    if (requestNewFile && rootEntry && !newFileDialog) {
      setNewFileDialog({ dirPath: rootEntry.path });
    }
  }, [requestNewFile, rootEntry, newFileDialog]);

  // F2 / Delete: only when sidebar tree has focus
  const handleTreeKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!activeFilePath) return;
    const isInput = e.target instanceof HTMLInputElement;
    if (isInput) return;

    if (e.key === 'F2') {
      e.preventDefault();
      setRenamingPath(activeFilePath);
    }

    if (e.key === 'Delete') {
      e.preventDefault();
      const fileName = activeFilePath.substring(activeFilePath.lastIndexOf('/') + 1);
      setDeleteConfirm({ path: activeFilePath, name: fileName });
    }
  }, [activeFilePath]);

  const handleDirContextMenu = useCallback((e: React.MouseEvent, dirPath: string) => {
    setCtxMenu({ x: e.clientX, y: e.clientY, dirPath, isDirTarget: true });
  }, []);

  const handleFileContextMenu = useCallback((e: React.MouseEvent, fileEntry: FileEntry) => {
    const dirPath = fileEntry.path.substring(0, fileEntry.path.lastIndexOf('/'));
    setCtxMenu({ x: e.clientX, y: e.clientY, dirPath, fileEntry });
  }, []);

  const handleNewFileFromCtx = () => {
    if (ctxMenu) {
      setNewFileDialog({ dirPath: ctxMenu.dirPath });
      setCtxMenu(null);
    }
  };

  const handleNewFolderFromCtx = () => {
    if (ctxMenu) {
      setNewFolderDialog({ dirPath: ctxMenu.dirPath });
      setCtxMenu(null);
    }
  };

  const handleRenameFromCtx = () => {
    if (ctxMenu?.fileEntry) {
      setRenamingPath(ctxMenu.fileEntry.path);
      setCtxMenu(null);
    }
  };

  const handleDeleteFromCtx = () => {
    if (ctxMenu?.fileEntry) {
      setDeleteConfirm({ path: ctxMenu.fileEntry.path, name: ctxMenu.fileEntry.name });
      setCtxMenu(null);
    }
  };

  const handleRenameDirFromCtx = () => {
    if (ctxMenu?.isDirTarget) {
      const dirName = ctxMenu.dirPath.substring(ctxMenu.dirPath.lastIndexOf('/') + 1);
      setRenameDirDialog({ dirPath: ctxMenu.dirPath, currentName: dirName });
      setCtxMenu(null);
    }
  };

  const handleDeleteDirFromCtx = () => {
    if (ctxMenu?.isDirTarget) {
      const dirName = ctxMenu.dirPath.substring(ctxMenu.dirPath.lastIndexOf('/') + 1);
      setDeleteConfirm({ path: ctxMenu.dirPath, name: dirName, isDirectory: true });
      setCtxMenu(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.isDirectory) {
      await onDeleteDirectory(deleteConfirm.path);
    } else {
      await onDeleteFile(deleteConfirm.path);
    }
    setDeleteConfirm(null);
  };

  const handleConfirmRename = useCallback(async (oldPath: string, newName: string) => {
    setRenamingPath(null);
    await onRenameFile(oldPath, newName);
  }, [onRenameFile]);

  const handleCancelRename = useCallback(() => {
    setRenamingPath(null);
  }, []);

  const handleCreateConfirm = async (fileName: string) => {
    if (!newFileDialog) return;
    await onCreateFile(newFileDialog.dirPath, fileName);
    setNewFileDialog(null);
    onNewFileDialogDone?.();
  };

  const handleDialogCancel = () => {
    setNewFileDialog(null);
    onNewFileDialogDone?.();
  };

  const openNewFileDialogForRoot = useCallback(() => {
    if (rootEntry) {
      setNewFileDialog({ dirPath: rootEntry.path });
    }
  }, [rootEntry]);

  const openNewFolderDialogForRoot = useCallback(() => {
    if (rootEntry) {
      setNewFolderDialog({ dirPath: rootEntry.path });
    }
  }, [rootEntry]);

  const handleFolderCreateConfirm = async (folderName: string) => {
    if (!newFolderDialog) return;
    await onCreateDirectory(newFolderDialog.dirPath, folderName);
    setNewFolderDialog(null);
  };

  return (
    <div
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}
      onContextMenu={(e) => {
        // Right-click on empty area of tree = create in root
        if (rootEntry && e.target === e.currentTarget) {
          e.preventDefault();
          setCtxMenu({ x: e.clientX, y: e.clientY, dirPath: rootEntry.path });
        }
      }}
    >
      <div className={styles.header}>
        <span>Explorer</span>
        <div className={styles.headerActions}>
          {rootEntry && (
            <>
              <button
                className={styles.iconButton}
                onClick={openNewFileDialogForRoot}
                title="New File (Ctrl+N)"
              >
                <Icon icon="codicon:new-file" width={16} />
              </button>
              <button
                className={styles.iconButton}
                onClick={openNewFolderDialogForRoot}
                title="New Folder"
              >
                <Icon icon="codicon:new-folder" width={16} />
              </button>
              <button
                className={styles.iconButton}
                onClick={onRefresh}
                title="Refresh Explorer"
              >
                <Icon icon="codicon:refresh" width={16} />
              </button>
            </>
          )}
          <button
            className={styles.iconButton}
            onClick={onOpenDirectory}
            title="Open Folder"
          >
            <Icon icon="codicon:folder-opened" width={16} />
          </button>
        </div>
      </div>
      <div
        className={styles.tree}
        tabIndex={0}
        onKeyDown={handleTreeKeyDown}
        onContextMenu={(e) => {
          // Right-click on tree background = create in root
          if (rootEntry && e.target === e.currentTarget) {
            e.preventDefault();
            setCtxMenu({ x: e.clientX, y: e.clientY, dirPath: rootEntry.path });
          }
        }}
      >
        {rootEntry ? (
          <FileTree
            entry={rootEntry}
            activeFilePath={activeFilePath}
            renamingPath={renamingPath}
            onFileSelect={onFileSelect}
            onDirContextMenu={handleDirContextMenu}
            onFileContextMenu={handleFileContextMenu}
            onStartRename={(path) => setRenamingPath(path)}
            onConfirmRename={handleConfirmRename}
            onCancelRename={handleCancelRename}
          />
        ) : (
          <div className={styles.empty}>
            <p>Open a folder to see files</p>
          </div>
        )}
      </div>

      {/* Sidebar context menu */}
      {ctxMenu && (
        <>
          <div className={styles.ctxOverlay} onClick={() => setCtxMenu(null)} onContextMenu={e => { e.preventDefault(); setCtxMenu(null); }} />
          <div
            className={styles.ctxMenu}
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            {!ctxMenu.fileEntry && (
              <>
                <div className={styles.ctxItem} onClick={handleNewFileFromCtx}>
                  <Icon icon="codicon:new-file" width={14} />
                  <span className={styles.ctxLabel}>New File</span>
                  <span className={styles.ctxShortcut}>Ctrl+N</span>
                </div>
                <div className={styles.ctxItem} onClick={handleNewFolderFromCtx}>
                  <Icon icon="codicon:new-folder" width={14} />
                  <span className={styles.ctxLabel}>New Folder</span>
                </div>
                {ctxMenu.isDirTarget && ctxMenu.dirPath !== rootEntry?.path && (
                  <>
                    <div className={styles.ctxDivider} />
                    <div className={styles.ctxItem} onClick={handleRenameDirFromCtx}>
                      <Icon icon="codicon:edit" width={14} />
                      <span className={styles.ctxLabel}>Rename Folder</span>
                    </div>
                    <div className={styles.ctxDivider} />
                    <div className={`${styles.ctxItem} ${styles.ctxItemDanger}`} onClick={handleDeleteDirFromCtx}>
                      <Icon icon="codicon:trash" width={14} />
                      <span className={styles.ctxLabel}>Delete Folder</span>
                    </div>
                  </>
                )}
              </>
            )}
            {ctxMenu.fileEntry && (
              <>
                <div className={styles.ctxItem} onClick={handleRenameFromCtx}>
                  <Icon icon="codicon:edit" width={14} />
                  <span className={styles.ctxLabel}>Rename</span>
                  <span className={styles.ctxShortcut}>F2</span>
                </div>
                <div className={styles.ctxDivider} />
                <div className={`${styles.ctxItem} ${styles.ctxItemDanger}`} onClick={handleDeleteFromCtx}>
                  <Icon icon="codicon:trash" width={14} />
                  <span className={styles.ctxLabel}>Delete</span>
                  <span className={styles.ctxShortcut}>Del</span>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* New File Dialog */}
      {newFileDialog && (
        <NewFileDialog
          dirPath={newFileDialog.dirPath}
          onConfirm={handleCreateConfirm}
          onCancel={handleDialogCancel}
        />
      )}
      {/* New Folder Dialog */}
      {newFolderDialog && (
        <NewFileDialog
          dirPath={newFolderDialog.dirPath}
          onConfirm={handleFolderCreateConfirm}
          onCancel={() => setNewFolderDialog(null)}
          mode="folder"
        />
      )}
      {/* Rename Folder Dialog */}
      {renameDirDialog && (
        <NewFileDialog
          dirPath={renameDirDialog.dirPath}
          onConfirm={async (newName) => {
            await onRenameDirectory(renameDirDialog.dirPath, newName);
            setRenameDirDialog(null);
          }}
          onCancel={() => setRenameDirDialog(null)}
          mode="rename-folder"
          initialValue={renameDirDialog.currentName}
        />
      )}
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <ConfirmDialog
          title={deleteConfirm.isDirectory ? 'Delete Folder' : 'Delete File'}
          message={<>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>{deleteConfirm.isDirectory ? ' and all its contents' : ''}?</>}
          warning="This action cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
