import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '@iconify/react';
import type { FileEntry } from '../../types';
import { flattenFiles } from '../../utils/fileSystem';
import styles from './CommandPalette.module.css';

interface CommandPaletteProps {
  rootEntry: FileEntry | null;
  onFileSelect: (entry: FileEntry) => void;
  onClose: () => void;
}

export function CommandPalette({ rootEntry, onFileSelect, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const allFiles = useMemo(() => {
    if (!rootEntry) return [];
    return flattenFiles(rootEntry);
  }, [rootEntry]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allFiles;
    const lower = query.toLowerCase();
    return allFiles.filter(f =>
      f.name.toLowerCase().includes(lower) ||
      f.path.toLowerCase().includes(lower)
    );
  }, [allFiles, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    const container = resultsRef.current;
    if (!container) return;
    const activeItem = container.children[activeIndex] as HTMLElement | undefined;
    activeItem?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[activeIndex]) {
        onFileSelect(filtered[activeIndex]);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  function highlightMatch(text: string, search: string): React.ReactNode {
    if (!search) return text;
    const lower = text.toLowerCase();
    const idx = lower.indexOf(search.toLowerCase());
    if (idx === -1) return text;

    return (
      <>
        {text.slice(0, idx)}
        <span className={styles.highlight}>{text.slice(idx, idx + search.length)}</span>
        {text.slice(idx + search.length)}
      </>
    );
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.palette} onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className={styles.input}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search files by name..."
        />
        <div className={styles.results} ref={resultsRef}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>
              {allFiles.length === 0 ? 'No folder opened' : 'No matching files'}
            </div>
          ) : (
            filtered.map((file, i) => (
              <div
                key={file.path}
                className={`${styles.item} ${i === activeIndex ? styles.active : ''}`}
                onClick={() => {
                  onFileSelect(file);
                  onClose();
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span className={styles.itemIcon}>
                  <Icon icon="vscode-icons:default-file" width={16} />
                </span>
                <div className={styles.itemContent}>
                  <div className={styles.itemName}>{highlightMatch(file.name, query)}</div>
                  <div className={styles.itemPath}>{highlightMatch(file.path, query)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
