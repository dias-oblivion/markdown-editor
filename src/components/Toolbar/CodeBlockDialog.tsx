import { useState, useRef, useEffect } from 'react';
import type { CodeBlockConfig } from '../../types';
import styles from './Toolbar.module.css';

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c', 'cpp',
  'csharp', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'html', 'css',
  'scss', 'sql', 'bash', 'shell', 'powershell', 'docker', 'yaml', 'json',
  'xml', 'markdown', 'lua', 'r', 'dart', 'elixir', 'haskell', 'clojure',
  'zig', 'nim', 'ocaml', 'perl', 'groovy', 'toml', 'ini', 'graphql',
];

interface CodeBlockDialogProps {
  onInsert: (config: CodeBlockConfig) => void;
  onCancel: () => void;
}

export function CodeBlockDialog({ onInsert, onCancel }: CodeBlockDialogProps) {
  const [language, setLanguage] = useState('');
  const [code, setCode] = useState('');
  const [useTabs, setUseTabs] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleLanguageChange(value: string) {
    setLanguage(value);
    if (value.length > 0) {
      const filtered = LANGUAGES.filter(l => l.startsWith(value.toLowerCase()));
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedSuggestion(0);
    } else {
      setShowSuggestions(false);
    }
  }

  function handleLanguageKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Tab' && showSuggestions && suggestions.length > 0) {
      e.preventDefault();
      setLanguage(suggestions[selectedSuggestion]);
      setShowSuggestions(false);
    } else if (e.key === 'ArrowDown' && showSuggestions) {
      e.preventDefault();
      setSelectedSuggestion(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp' && showSuggestions) {
      e.preventDefault();
      setSelectedSuggestion(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      if (showSuggestions) {
        setShowSuggestions(false);
      } else {
        onCancel();
      }
    }
  }

  function handleCodeKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const indent = useTabs ? '\t' : '  ';
      setCode(code.substring(0, start) + indent + code.substring(end));
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + indent.length;
      }, 0);
    } else if (e.ctrlKey && e.key === 'Enter') {
      handleInsert();
    }
  }

  function handleInsert() {
    onInsert({ language, code, useTabs });
  }

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.dialogTitle}>Code Block</div>

        <div className={styles.dialogField}>
          <div className={styles.dialogLabel}>
            Language (Tab to autocomplete)
          </div>
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              className={styles.dialogInput}
              value={language}
              onChange={e => handleLanguageChange(e.target.value)}
              onKeyDown={handleLanguageKeyDown}
              placeholder="javascript, python, ruby..."
            />
            {showSuggestions && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                marginTop: 2,
                maxHeight: 150,
                overflowY: 'auto',
                zIndex: 10,
              }}>
                {suggestions.map((s, i) => (
                  <div
                    key={s}
                    style={{
                      padding: '4px 8px',
                      fontSize: 13,
                      cursor: 'pointer',
                      background: i === selectedSuggestion ? 'var(--accent-muted)' : undefined,
                      color: i === selectedSuggestion ? 'var(--accent-primary)' : undefined,
                    }}
                    onClick={() => {
                      setLanguage(s);
                      setShowSuggestions(false);
                    }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.dialogField}>
          <div className={styles.dialogLabel}>
            <span>Code (optional) — Tab to indent, Ctrl+Enter to insert</span>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={useTabs}
                onChange={e => setUseTabs(e.target.checked)}
              />
              Use tabs
            </label>
          </div>
          <textarea
            className={styles.dialogTextarea}
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={handleCodeKeyDown}
            placeholder="Paste or type your code here..."
          />
        </div>

        <div className={styles.dialogActions}>
          <button className={`${styles.dialogButton} ${styles.dialogButtonCancel}`} onClick={onCancel}>
            Cancel
          </button>
          <button className={`${styles.dialogButton} ${styles.dialogButtonPrimary}`} onClick={handleInsert}>
            Insert Code
          </button>
        </div>
      </div>
    </div>
  );
}
