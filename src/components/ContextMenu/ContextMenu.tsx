import { useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import type { FormatAction } from '../../types';
import styles from './ContextMenu.module.css';

interface ContextMenuProps {
  x: number;
  y: number;
  onFormat: (action: FormatAction) => void;
  onClose: () => void;
}

const FORMAT_OPTIONS: { action: FormatAction; label: string; icon: string; preview: string }[] = [
  { action: 'bold', label: 'Bold', icon: 'codicon:bold', preview: '**text**' },
  { action: 'italic', label: 'Italic', icon: 'codicon:italic', preview: '_text_' },
  { action: 'highlight', label: 'Highlight', icon: 'codicon:lightbulb', preview: '==text==' },
  { action: 'strikethrough', label: 'Strikethrough', icon: 'codicon:text-size', preview: '~~text~~' },
  { action: 'superscript', label: 'Superscript', icon: 'codicon:arrow-small-up', preview: '<sup>' },
  { action: 'subscript', label: 'Subscript', icon: 'codicon:arrow-small-down', preview: '<sub>' },
];

export function ContextMenu({ x, y, onFormat, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = `${window.innerWidth - rect.width - 8}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${window.innerHeight - rect.height - 8}px`;
    }
  }, []);

  return (
    <>
      <div className={styles.overlay} onClick={onClose} onContextMenu={e => { e.preventDefault(); onClose(); }} />
      <div
        ref={menuRef}
        className={styles.menu}
        style={{ left: x, top: y }}
      >
        {FORMAT_OPTIONS.map(({ action, label, icon, preview }) => (
          <div
            key={action}
            className={styles.item}
            onClick={() => {
              onFormat(action);
              onClose();
            }}
          >
            <span className={styles.itemLabel}>
              <Icon icon={icon} width={14} />
              {label}
            </span>
            <span className={styles.itemPreview}>{preview}</span>
          </div>
        ))}
      </div>
    </>
  );
}
