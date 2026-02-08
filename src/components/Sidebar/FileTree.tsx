import { useState } from 'react';
import { Icon } from '@iconify/react';
import type { FileEntry } from '../../types';
import styles from './Sidebar.module.css';

interface FileTreeProps {
  entry: FileEntry;
  depth?: number;
  activeFilePath: string | null;
  onFileSelect: (entry: FileEntry) => void;
}

export function FileTree({ entry, depth = 0, activeFilePath, onFileSelect }: FileTreeProps) {
  const [expanded, setExpanded] = useState(depth < 1);

  if (!entry.isDirectory) {
    const isActive = entry.path === activeFilePath;
    const iconName = getFileIcon(entry.name);

    return (
      <div
        className={`${styles.treeItem} ${isActive ? styles.active : ''}`}
        style={{ '--depth': depth } as React.CSSProperties}
        onClick={() => onFileSelect(entry)}
        title={entry.path}
      >
        <span className={styles.treeItemIcon}>
          <Icon icon={iconName} width={16} />
        </span>
        <span className={styles.treeItemName}>{entry.name}</span>
      </div>
    );
  }

  return (
    <div>
      <div
        className={styles.treeItem}
        style={{ '--depth': depth } as React.CSSProperties}
        onClick={() => setExpanded(!expanded)}
      >
        <span className={`${styles.treeItemIcon} ${styles.chevron} ${expanded ? styles.open : ''}`}>
          <Icon icon="codicon:chevron-right" width={14} />
        </span>
        <span className={styles.treeItemIcon}>
          <Icon
            icon={expanded ? 'vscode-icons:default-folder-opened' : 'vscode-icons:default-folder'}
            width={16}
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
          onFileSelect={onFileSelect}
        />
      ))}
    </div>
  );
}

function getFileIcon(name: string): string {
  const lower = name.toLowerCase();
  if (/\.(md|mdx|markdown)$/.test(lower)) return 'vscode-icons:file-type-markdown';
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
  return 'vscode-icons:default-file';
}
