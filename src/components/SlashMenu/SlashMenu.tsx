import { useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import type { SlashCommand } from '../Editor/slashCommands';
import styles from './SlashMenu.module.css';

interface SlashMenuProps {
  items: SlashCommand[];
  activeIndex: number;
  /** Coordenadas de viewport (do `/`), usadas com position: fixed. */
  pos: { left: number; top: number };
  mode: 'list' | 'arg';
  argText: string;
  onSelect: (index: number) => void;
  onHover: (index: number) => void;
}

export function SlashMenu({ items, activeIndex, pos, mode, argText, onSelect, onHover }: SlashMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjusted, setAdjusted] = useState(pos);

  // Reposiciona para caber na viewport (nudge horizontal, flip vertical).
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) {
      setAdjusted(pos);
      return;
    }
    const rect = menu.getBoundingClientRect();
    let left = pos.left;
    let top = pos.top;
    if (left + rect.width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - rect.width - 8);
    }
    if (top + rect.height > window.innerHeight - 8) {
      // Vira para cima do cursor
      top = Math.max(8, pos.top - rect.height - 22);
    }
    setAdjusted({ left, top });
  }, [pos, items.length, mode]);

  return (
    <div
      ref={menuRef}
      className={styles.menu}
      style={{ left: adjusted.left, top: adjusted.top }}
      role="listbox"
      data-slash-menu
    >
      {mode === 'arg' && items[0] ? (
        <div className={`${styles.item} ${styles.active}`} onMouseDown={(e) => { e.preventDefault(); onSelect(0); }}>
          <span className={styles.itemLabel}>
            <Icon icon={items[0].icon} width={14} className={styles.itemIcon} />
            {items[0].label}
          </span>
          <span className={styles.itemHint}>
            {argText.trim() ? `enviar "${truncate(argText.trim())}"` : 'digite a pergunta…'}
          </span>
        </div>
      ) : (
        items.map((cmd, i) => (
          <div
            key={cmd.id}
            className={`${styles.item} ${i === activeIndex ? styles.active : ''}`}
            role="option"
            aria-selected={i === activeIndex}
            onMouseDown={(e) => { e.preventDefault(); onSelect(i); }}
            onMouseEnter={() => onHover(i)}
          >
            <span className={styles.itemLabel}>
              <Icon icon={cmd.icon} width={14} className={styles.itemIcon} />
              {cmd.label}
            </span>
            <span className={styles.itemHint}>{cmd.hint}</span>
          </div>
        ))
      )}
    </div>
  );
}

function truncate(s: string, max = 28): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
