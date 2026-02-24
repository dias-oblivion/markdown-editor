import { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';
import type { FileEntry } from '../../types';
import styles from './Sidebar.module.css';

interface FileTreeProps {
  entry: FileEntry;
  depth?: number;
  activeFilePath: string | null;
  renamingPath: string | null;
  onFileSelect: (entry: FileEntry) => void;
  onDirContextMenu?: (e: React.MouseEvent, dirPath: string) => void;
  onFileContextMenu?: (e: React.MouseEvent, entry: FileEntry) => void;
  onStartRename: (path: string) => void;
  onConfirmRename: (oldPath: string, newName: string) => void;
  onCancelRename: () => void;
}

export function FileTree({
  entry, depth = 0, activeFilePath, renamingPath,
  onFileSelect, onDirContextMenu, onFileContextMenu,
  onStartRename, onConfirmRename, onCancelRename,
}: FileTreeProps) {
  const [expanded, setExpanded] = useState(depth < 1);

  if (!entry.isDirectory) {
    const isActive = entry.path === activeFilePath;
    const isRenaming = entry.path === renamingPath;
    const iconName = getFileIcon(entry.name);

    return (
      <div
        className={`${styles.treeItem} ${isActive ? styles.active : ''}`}
        style={{ '--depth': depth } as React.CSSProperties}
        onClick={() => { if (!isRenaming) onFileSelect(entry); }}
        onDoubleClick={(e) => { e.stopPropagation(); onStartRename(entry.path); }}
        onContextMenu={(e) => {
          if (onFileContextMenu) {
            e.preventDefault();
            e.stopPropagation();
            onFileContextMenu(e, entry);
          }
        }}
        title={entry.path}
      >
        <span className={styles.treeItemIcon}>
          <Icon icon={iconName} width={18} />
        </span>
        {isRenaming ? (
          <RenameInput
            initialName={entry.name}
            onConfirm={(newName) => onConfirmRename(entry.path, newName)}
            onCancel={onCancelRename}
          />
        ) : (
          <span className={styles.treeItemName}>{entry.name}</span>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        className={styles.treeItem}
        style={{ '--depth': depth } as React.CSSProperties}
        onClick={() => setExpanded(!expanded)}
        onContextMenu={(e) => {
          if (onDirContextMenu) {
            e.preventDefault();
            e.stopPropagation();
            onDirContextMenu(e, entry.path);
          }
        }}
      >
        <span className={`${styles.treeItemIcon} ${styles.chevron} ${expanded ? styles.open : ''}`}>
          <Icon icon="lucide:chevron-right" width={14} />
        </span>
        <span className={styles.treeItemIcon}>
          <Icon
            icon={expanded ? 'tabler:folder-open' : 'tabler:folder-filled'}
            width={18}
            className={styles.folderIcon}
          />
        </span>
        <span className={styles.treeItemName}>{entry.name}</span>
      </div>
      {expanded && entry.children?.map(child => (
        <FileTree
          key={child.path}
          entry={child}
          depth={depth + 1}
          activeFilePath={activeFilePath}
          renamingPath={renamingPath}
          onFileSelect={onFileSelect}
          onDirContextMenu={onDirContextMenu}
          onFileContextMenu={onFileContextMenu}
          onStartRename={onStartRename}
          onConfirmRename={onConfirmRename}
          onCancelRename={onCancelRename}
        />
      ))}
    </div>
  );
}

function RenameInput({
  initialName,
  onConfirm,
  onCancel,
}: {
  initialName: string;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);
  const committedRef = useRef(false);

  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      input.focus();
      const dotIndex = initialName.lastIndexOf('.');
      input.setSelectionRange(0, dotIndex > 0 ? dotIndex : initialName.length);
    }
  }, [initialName]);

  const handleCommit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    const trimmed = value.trim();
    if (trimmed && trimmed !== initialName) {
      onConfirm(trimmed);
    } else {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      className={styles.renameInput}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          e.preventDefault();
          handleCommit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          committedRef.current = true;
          onCancel();
        }
      }}
      onClick={(e) => e.stopPropagation()}
      onBlur={handleCommit}
    />
  );
}

function getFileIcon(name: string): string {
  const lower = name.toLowerCase();
  if (/\.(md|mdx|markdown)$/.test(lower)) return 'lucide:file-text';
  if (/\.tsx$/.test(lower)) return 'vscode-icons:file-type-reactts';
  if (/\.ts$/.test(lower)) return 'vscode-icons:file-type-typescript';
  if (/\.jsx$/.test(lower)) return 'vscode-icons:file-type-reactjs';
  if (/\.js$/.test(lower)) return 'vscode-icons:file-type-js';
  if (/\.json$/.test(lower)) return 'vscode-icons:file-type-json';
  if (/\.css$/.test(lower)) return 'vscode-icons:file-type-css';
  if (/\.scss$/.test(lower)) return 'vscode-icons:file-type-scss';
  if (/\.less$/.test(lower)) return 'vscode-icons:file-type-less';
  if (/\.html?$/.test(lower)) return 'vscode-icons:file-type-html';
  if (/\.(png|jpg|jpeg|gif|webp|bmp)$/.test(lower)) return 'vscode-icons:file-type-image';
  if (/\.svg$/.test(lower)) return 'vscode-icons:file-type-svg';
  if (/\.py$/.test(lower)) return 'vscode-icons:file-type-python';
  if (/\.go$/.test(lower)) return 'vscode-icons:file-type-go';
  if (/\.rs$/.test(lower)) return 'vscode-icons:file-type-rust';
  if (/\.java$/.test(lower)) return 'vscode-icons:file-type-java';
  if (/\.rb$/.test(lower)) return 'vscode-icons:file-type-ruby';
  if (/\.php$/.test(lower)) return 'vscode-icons:file-type-php';
  if (/\.sh$/.test(lower)) return 'vscode-icons:file-type-shell';
  if (/\.yml$|\.yaml$/.test(lower)) return 'vscode-icons:file-type-yaml';
  if (/\.toml$/.test(lower)) return 'vscode-icons:file-type-toml';
  if (/\.xml$/.test(lower)) return 'vscode-icons:file-type-xml';
  if (/\.sql$/.test(lower)) return 'vscode-icons:file-type-sql';
  if (/\.docker|dockerfile/i.test(lower)) return 'vscode-icons:file-type-docker';
  if (/\.gitignore$/.test(lower)) return 'vscode-icons:file-type-git';
  if (/\.env/.test(lower)) return 'vscode-icons:file-type-dotenv';
  if (/\.txt$/.test(lower)) return 'vscode-icons:file-type-text';
  if (/\.pdf$/.test(lower)) return 'vscode-icons:file-type-pdf';
  if (/\.lock$/.test(lower)) return 'vscode-icons:file-type-lock';
  if (/^license$/i.test(lower)) return 'vscode-icons:file-type-license';
  if (/^readme/i.test(lower)) return 'vscode-icons:file-type-readme';
  if (/^contributing/i.test(lower)) return 'vscode-icons:file-type-contributing';
  if (/^changelog/i.test(lower)) return 'vscode-icons:file-type-changelog';
  return 'vscode-icons:default-file';
}
