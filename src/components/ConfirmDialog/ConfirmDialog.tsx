import type { ReactNode } from 'react';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  title: string;
  message: ReactNode;
  warning?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  warning,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmBtnClass = variant === 'danger' ? styles.btnDanger : styles.btnPrimary;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      (document.activeElement as HTMLButtonElement)?.click();
    }
    if (e.key === 'Escape') {
      onCancel();
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
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.title}>{title}</div>
        <p className={styles.message}>{message}</p>
        {warning && <p className={styles.warning}>{warning}</p>}
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.btnCancel}`} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={`${styles.btn} ${confirmBtnClass}`} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
