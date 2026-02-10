import { useState, useRef, useEffect } from 'react';
import styles from './Sidebar.module.css';

interface NewFileDialogProps {
  dirPath: string;
  onConfirm: (fileName: string) => void;
  onCancel: () => void;
}

export function NewFileDialog({ dirPath, onConfirm, onCancel }: NewFileDialogProps) {
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function validate(name: string): string | null {
    const trimmed = name.trim();
    if (!trimmed) return 'File name is required';
    if (/[<>:"/\\|?*]/.test(trimmed)) return 'Invalid characters in file name';
    return null;
  }

  function handleConfirm() {
    let name = fileName.trim();
    const validationError = validate(name);
    if (validationError) {
      setError(validationError);
      return;
    }
    // Auto-append .md if no extension
    if (!name.includes('.')) {
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
        <div className={styles.dialogTitle}>New File</div>

        <div className={styles.dialogField}>
          <div className={styles.dialogLabel}>
            Create in <strong>{folderName}/</strong>
          </div>
          <input
            ref={inputRef}
            className={styles.dialogInput}
            value={fileName}
            onChange={e => { setFileName(e.target.value); setError(''); }}
            onKeyDown={handleKeyDown}
            placeholder="my-note.md"
          />
          {error && <div className={styles.dialogError}>{error}</div>}
        </div>

        <div className={styles.dialogHint}>
          Extension <code>.md</code> will be added automatically if omitted
        </div>

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
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
