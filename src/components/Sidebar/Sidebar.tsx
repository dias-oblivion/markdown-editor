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
  requestNewFile?: boolean;
  onNewFileDialogDone?: () => void;
}

export function Sidebar({ rootEntry, activeFilePath, onOpenDirectory, onFileSelect, onCreateFile, requestNewFile, onNewFileDialogDone }: SidebarProps) {
  const [newFileDialog, setNewFileDialog] = useState<{ dirPath: string } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; dirPath: string } | null>(null);

  // Open dialog when parent requests it (e.g. Ctrl+N)
  useEffect(() => {
    if (requestNewFile && rootEntry && !newFileDialog) {
      setNewFileDialog({ dirPath: rootEntry.path });
    }
  }, [requestNewFile, rootEntry, newFileDialog]);

  const handleDirContextMenu = useCallback((e: React.MouseEvent, dirPath: string) => {
    setCtxMenu({ x: e.clientX, y: e.clientY, dirPath });
  }, []);

  const handleNewFileFromCtx = () => {
    if (ctxMenu) {
      setNewFileDialog({ dirPath: ctxMenu.dirPath });
      setCtxMenu(null);
    }
  };

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
            <button
              className={styles.iconButton}
              onClick={openNewFileDialogForRoot}
              title="New File (Ctrl+N)"
            >
              <Icon icon="codicon:new-file" width={16} />
            </button>
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
            onFileSelect={onFileSelect}
            onDirContextMenu={handleDirContextMenu}
          />
        ) : (
          <div className={styles.empty}>
            <Icon icon="codicon:folder" width={32} style={{ opacity: 0.4 }} />
            <p>No folder opened</p>
            <button className={styles.openButton} onClick={onOpenDirectory}>
              Open Folder
            </button>
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
    </div>
  );
}
