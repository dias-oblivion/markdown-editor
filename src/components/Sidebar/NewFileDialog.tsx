import { useState, useRef, useEffect } from 'react';
import styles from './Sidebar.module.css';

interface NewFileDialogProps {
  dirPath: string;
  onConfirm: (fileName: string) => void;
  onCancel: () => void;
  mode?: 'file' | 'folder' | 'rename-folder';
  initialValue?: string;
}

export function NewFileDialog({ dirPath, onConfirm, onCancel, mode = 'file', initialValue = '' }: NewFileDialogProps) {
  const [fileName, setFileName] = useState(initialValue);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const isFolder = mode === 'folder' || mode === 'rename-folder';
  const isRename = mode === 'rename-folder';

  function validate(name: string): string | null {
    const trimmed = name.trim();
    if (!trimmed) return isFolder ? 'Folder name is required' : 'File name is required';
    if (/[<>:"/\\|?*]/.test(trimmed)) return isFolder ? 'Invalid characters in folder name' : 'Invalid characters in file name';
    return null;
  }

  function handleConfirm() {
    let name = fileName.trim();
    const validationError = validate(name);
    if (validationError) {
      setError(validationError);
      return;
    }
    // Auto-append .md if no extension (files only)
    if (!isFolder && !name.includes('.')) {
      name += '.md';
    }
    onConfirm(name);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  }

  // Show just the folder name for context
  const folderName = dirPath.split('/').pop() || dirPath;

  return (
    <div className={styles.dialogOverlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.dialogTitle}>{isRename ? 'Rename Folder' : isFolder ? 'New Folder' : 'New File'}</div>

        <div className={styles.dialogField}>
          {!isRename && (
            <div className={styles.dialogLabel}>
              Create in <strong>{folderName}/</strong>
            </div>
          )}
          <input
            ref={inputRef}
            className={styles.dialogInput}
            value={fileName}
            onChange={e => { setFileName(e.target.value); setError(''); }}
            onKeyDown={handleKeyDown}
            placeholder={isFolder ? 'my-folder' : 'my-note.md'}
          />
          {error && <div className={styles.dialogError}>{error}</div>}
        </div>

        {!isFolder && (
          <div className={styles.dialogHint}>
            Extension <code>.md</code> will be added automatically if omitted
          </div>
        )}

        <div className={styles.dialogActions}>
          <button
            className={`${styles.dialogButton} ${styles.dialogButtonCancel}`}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className={`${styles.dialogButton} ${styles.dialogButtonPrimary}`}
            onClick={handleConfirm}
          >
            {isRename ? 'Rename' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
