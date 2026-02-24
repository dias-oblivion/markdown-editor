import { useState, useCallback, useEffect } from 'react';
import { Icon } from '@iconify/react';
import type { FileEntry } from '../../types';
import { FileTree } from './FileTree';
import { NewFileDialog } from './NewFileDialog';
import styles from './Sidebar.module.css';

interface SidebarProps {
  rootEntry: FileEntry | null;
  activeFilePath: string | null;
  onOpenDirectory: () => void;
  onFileSelect: (entry: FileEntry) => void;
  onCreateFile: (dirPath: string, fileName: string) => Promise<void>;
  onRenameFile: (oldPath: string, newName: string) => Promise<void>;
  onDeleteFile: (filePath: string) => Promise<void>;
  onRefresh: () => void;
  requestNewFile?: boolean;
  onNewFileDialogDone?: () => void;
}

export function Sidebar({ rootEntry, activeFilePath, onOpenDirectory, onFileSelect, onCreateFile, onRenameFile, onDeleteFile, onRefresh, requestNewFile, onNewFileDialogDone }: SidebarProps) {
  const [newFileDialog, setNewFileDialog] = useState<{ dirPath: string } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; dirPath: string; fileEntry?: FileEntry } | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ path: string; name: string } | null>(null);

  // Open dialog when parent requests it (e.g. Ctrl+N)
  useEffect(() => {
    if (requestNewFile && rootEntry && !newFileDialog) {
      setNewFileDialog({ dirPath: rootEntry.path });
    }
  }, [requestNewFile, rootEntry, newFileDialog]);

  const handleDirContextMenu = useCallback((e: React.MouseEvent, dirPath: string) => {
    setCtxMenu({ x: e.clientX, y: e.clientY, dirPath });
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

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    await onDeleteFile(deleteConfirm.path);
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

  return (
    <div
      className={styles.sidebar}
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
            <div className={styles.ctxItem} onClick={handleNewFileFromCtx}>
              <Icon icon="codicon:new-file" width={14} />
              New File
            </div>
            {ctxMenu.fileEntry && (
              <>
                <div className={styles.ctxItem} onClick={handleRenameFromCtx}>
                  <Icon icon="codicon:edit" width={14} />
                  Rename
                </div>
                <div className={styles.ctxDivider} />
                <div className={`${styles.ctxItem} ${styles.ctxItemDanger}`} onClick={handleDeleteFromCtx}>
                  <Icon icon="codicon:trash" width={14} />
                  Delete
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
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className={styles.dialogOverlay} onClick={() => setDeleteConfirm(null)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dialogTitle}>Delete File</div>
            <p className={styles.deleteMessage}>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
            </p>
            <p className={styles.deleteWarning}>This action cannot be undone.</p>
            <div className={styles.dialogActions}>
              <button
                className={`${styles.dialogButton} ${styles.dialogButtonCancel}`}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className={`${styles.dialogButton} ${styles.dialogButtonDanger}`}
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
