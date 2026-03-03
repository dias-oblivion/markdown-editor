import { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import type { ColorTheme } from '../../types';
import styles from './SettingsPanel.module.css';

interface SettingsMenuProps {
  colorTheme: ColorTheme;
  onColorThemeChange: (theme: ColorTheme) => void;
  onClose: () => void;
  anchorBottom: number;
  anchorLeft: number;
}

const THEMES: { id: ColorTheme; name: string; color: string }[] = [
  { id: 'matte-black', name: 'Matte Black', color: '#e8a838' },
  { id: 'github-dark', name: 'GitHub Dark', color: '#58a6ff' },
];

export function SettingsMenu({ colorTheme, onColorThemeChange, onClose, anchorBottom, anchorLeft }: SettingsMenuProps) {
  const [showThemes, setShowThemes] = useState(false);
  const themesItemRef = useRef<HTMLButtonElement>(null);
  const [submenuPos, setSubmenuPos] = useState<{ left: number; bottom: number } | null>(null);

  const openThemes = useCallback(() => {
    if (themesItemRef.current) {
      const rect = themesItemRef.current.getBoundingClientRect();
      setSubmenuPos({ left: rect.right + 4, bottom: window.innerHeight - rect.top - rect.height });
    }
    setShowThemes(true);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const menuStyle: React.CSSProperties = {
    left: anchorLeft,
    bottom: anchorBottom,
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />

      <div className={styles.menu} style={menuStyle}>
        <button
          ref={themesItemRef}
          className={styles.menuItem}
          onMouseEnter={openThemes}
          onClick={openThemes}
        >
          <span className={styles.menuItemLabel}>Themes</span>
          <Icon icon="codicon:chevron-right" width={14} className={styles.menuItemChevron} />
        </button>
      </div>

      {showThemes && submenuPos && (
        <div
          className={styles.submenu}
          style={{ left: submenuPos.left, bottom: submenuPos.bottom }}
        >
          <div className={styles.submenuHeader}>Color Theme</div>
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`${styles.themeOption} ${colorTheme === t.id ? styles.active : ''}`}
              onClick={() => { onColorThemeChange(t.id); onClose(); }}
            >
              {colorTheme === t.id ? (
                <Icon icon="codicon:check" width={14} className={styles.checkIcon} />
              ) : (
                <span className={styles.checkPlaceholder} />
              )}
              <span>{t.name}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
