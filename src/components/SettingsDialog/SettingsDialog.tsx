import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import type { ThemeId, AIProvider, AISettings } from '../../types';
import { THEMES } from '../../types';
import styles from './SettingsDialog.module.css';

type Tab = 'appearance' | 'ai' | 'editor';

const AI_PROVIDERS: { id: AIProvider; label: string }[] = [
  { id: 'claude',   label: 'Claude' },
  { id: 'copilot',  label: 'GitHub Copilot' },
  { id: 'opencode', label: 'Opencode' },
];

interface SettingsDialogProps {
  activeTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  aiSettings: AISettings;
  onAISettingsChange: (settings: AISettings) => void;
  onClose: () => void;
}

export function SettingsDialog({
  activeTheme,
  onThemeChange,
  aiSettings,
  onAISettingsChange,
  onClose,
}: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<Tab>('appearance');
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Close when clicking the overlay (but not the dialog)
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={handleOverlayClick}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label="Configurações">

        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Configurações</h2>
          <button className={styles.closeButton} onClick={onClose} title="Fechar (Esc)">
            <Icon icon="codicon:close" width={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {(['appearance', 'ai', 'editor'] as Tab[]).map((tab) => (
            <button
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'appearance' ? 'Aparência' : tab === 'ai' ? 'AI Provider' : 'Editor'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className={styles.body}>

          {/* ── Appearance tab ── */}
          {activeTab === 'appearance' && (
            <>
              <p className={styles.sectionTitle}>Tema</p>
              <div className={styles.themeGrid}>
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    className={`${styles.themeSwatch} ${activeTheme === theme.id ? styles.themeSwatchSelected : ''}`}
                    onClick={() => onThemeChange(theme.id)}
                    title={theme.name}
                  >
                    {activeTheme === theme.id && (
                      <span className={styles.checkBadge}>✓</span>
                    )}
                    <div className={styles.swatchColors}>
                      {theme.swatchColors.map((color, i) => (
                        <div key={i} className={styles.swatchColor} style={{ background: color }} />
                      ))}
                    </div>
                    <div
                      className={styles.swatchLabel}
                      style={{ background: theme.swatchColors[1], color: theme.isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }}
                    >
                      {theme.name}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── AI Provider tab ── */}
          {activeTab === 'ai' && (
            <>
              <p className={styles.sectionTitle}>Provedor de AI</p>
              <div className={styles.settingRow}>
                <div>
                  <div className={styles.settingLabel}>Provider</div>
                  <div className={styles.settingDesc}>Serviço de AI para assistente de escrita</div>
                </div>
                <select
                  className={styles.settingSelect}
                  value={aiSettings.provider}
                  onChange={(e) =>
                    onAISettingsChange({ ...aiSettings, provider: e.target.value as AIProvider })
                  }
                >
                  {AI_PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.settingRow}>
                <div>
                  <div className={styles.settingLabel}>Terminal</div>
                  <div className={styles.settingDesc}>Mostrar terminal integrado do AI</div>
                </div>
                <button
                  className={`${styles.toggle} ${aiSettings.terminalVisible ? styles.toggleOn : styles.toggleOff}`}
                  onClick={() =>
                    onAISettingsChange({ ...aiSettings, terminalVisible: !aiSettings.terminalVisible })
                  }
                  title={aiSettings.terminalVisible ? 'Ocultar terminal' : 'Mostrar terminal'}
                >
                  <span
                    className={`${styles.toggleKnob} ${aiSettings.terminalVisible ? styles.toggleKnobOn : styles.toggleKnobOff}`}
                  />
                </button>
              </div>
            </>
          )}

          {/* ── Editor tab ── */}
          {activeTab === 'editor' && (
            <p className={styles.placeholder}>Configurações do editor em breve.</p>
          )}

        </div>
      </div>
    </div>
  );
}
