import styles from './UnsavedChangesDialog.module.css';

interface UnsavedChangesDialogProps {
  fileName: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function UnsavedChangesDialog({ fileName, onSave, onDiscard, onCancel }: UnsavedChangesDialogProps) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onCancel();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      (document.activeElement as HTMLButtonElement)?.click();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const container = e.currentTarget.querySelector(`.${styles.actions}`);
      if (!container) return;
      const buttons = Array.from(container.querySelectorAll('button'));
      const idx = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (e.key === 'ArrowLeft') buttons[Math.max(0, idx - 1)]?.focus();
      if (e.key === 'ArrowRight') buttons[Math.min(buttons.length - 1, idx + 1)]?.focus();
    }
  }

  return (
    <div className={styles.overlay} onClick={onCancel} onKeyDown={handleKeyDown}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.title}>Mudanças não salvas</div>
        <p className={styles.message}>
          O arquivo <strong>{fileName}</strong> possui mudanças não salvas.
          O que você deseja fazer?
        </p>
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.btnCancel}`} onClick={onCancel}>
            Cancelar
          </button>
          <button className={`${styles.btn} ${styles.btnDiscard}`} onClick={onDiscard}>
            Descartar
          </button>
          <button className={`${styles.btn} ${styles.btnSave}`} onClick={onSave} autoFocus>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
