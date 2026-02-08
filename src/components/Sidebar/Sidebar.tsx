import { Icon } from '@iconify/react';
import type { FileEntry } from '../../types';
import { FileTree } from './FileTree';
import styles from './Sidebar.module.css';

interface SidebarProps {
  rootEntry: FileEntry | null;
  activeFilePath: string | null;
  onOpenDirectory: () => void;
  onFileSelect: (entry: FileEntry) => void;
}

export function Sidebar({ rootEntry, activeFilePath, onOpenDirectory, onFileSelect }: SidebarProps) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <span>Explorer</span>
        <div className={styles.headerActions}>
          <button
            className={styles.iconButton}
            onClick={onOpenDirectory}
            title="Open Folder"
          >
            <Icon icon="codicon:folder-opened" width={16} />
          </button>
        </div>
      </div>
      <div className={styles.tree}>
        {rootEntry ? (
          <FileTree
            entry={rootEntry}
            activeFilePath={activeFilePath}
            onFileSelect={onFileSelect}
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
    </div>
  );
}
