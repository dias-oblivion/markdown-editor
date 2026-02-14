import { useEffect, useRef, useCallback, useState } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { searchKeymap } from '@codemirror/search';
import type { ViewMode } from '../../types';
import { getWordCount, getCharCount, getFileSize, getReadTime } from '../../utils/markdown';
import { MarkdownPreview } from './MarkdownPreview';
import styles from './Editor.module.css';

// ── Syntax highlighting themes ──

const darkHighlight = HighlightStyle.define([
  { tag: tags.comment, color: '#6a737d' },
  { tag: tags.keyword, color: '#5c9ce6' },
  { tag: tags.string, color: '#4caf50' },
  { tag: tags.number, color: '#e85454' },
  { tag: tags.bool, color: '#e85454' },
  { tag: tags.operator, color: '#e8a838' },
  { tag: tags.function(tags.variableName), color: '#e8a838' },
  { tag: tags.definition(tags.variableName), color: '#d4d4d4' },
  { tag: tags.typeName, color: '#e8a838' },
  { tag: tags.propertyName, color: '#e85454' },
  { tag: tags.heading, color: '#4FC3F7', fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.link, color: '#5c9ce6', textDecoration: 'underline' },
  { tag: tags.url, color: '#5c9ce6' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.meta, color: '#7C4DFF' },
  { tag: tags.processingInstruction, color: '#5c9ce6' },
]);

const lightHighlight = HighlightStyle.define([
  { tag: tags.comment, color: '#6a737d' },
  { tag: tags.keyword, color: '#1976d2' },
  { tag: tags.string, color: '#388e3c' },
  { tag: tags.number, color: '#d32f2f' },
  { tag: tags.bool, color: '#d32f2f' },
  { tag: tags.operator, color: '#c48820' },
  { tag: tags.function(tags.variableName), color: '#c48820' },
  { tag: tags.definition(tags.variableName), color: '#1a1a1a' },
  { tag: tags.typeName, color: '#c48820' },
  { tag: tags.propertyName, color: '#d32f2f' },
  { tag: tags.heading, color: '#0277BD', fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.link, color: '#1976d2', textDecoration: 'underline' },
  { tag: tags.url, color: '#1976d2' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.meta, color: '#5E35B1' },
  { tag: tags.processingInstruction, color: '#1976d2' },
]);

interface EditorProps {
  content: string;
  viewMode: ViewMode;
  theme: 'light' | 'dark';
  onChange: (content: string) => void;
  onInsertRef: React.MutableRefObject<((text: string) => void) | null>;
  showFind: boolean;
  onCloseFind: () => void;
}

export function Editor({ content, viewMode, theme, onChange, onInsertRef, showFind, onCloseFind }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const highlightCompartment = useRef(new Compartment());
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [matchWord, setMatchWord] = useState(false);
  const findInputRef = useRef<HTMLInputElement>(null);

  // Always keep ref pointing to latest onChange
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorRef.current) return;

    const initialStyle = theme === 'dark' ? darkHighlight : lightHighlight;

    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        highlightCompartment.current.of(syntaxHighlighting(initialStyle)),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          indentWithTab,
        ]),
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': {
            height: '100%',
            backgroundColor: 'var(--bg-editor)',
          },
          '.cm-content': {
            caretColor: 'var(--accent-primary)',
            color: 'var(--text-primary)',
          },
          '.cm-scroller': {
            fontFamily: 'var(--font-mono)',
            fontSize: '14px',
            lineHeight: '1.6',
          },
          '.cm-gutters': {
            backgroundColor: 'var(--bg-tertiary)',
            borderRight: '1px solid var(--border-color)',
            color: 'var(--text-muted)',
          },
          '.cm-activeLineGutter': {
            backgroundColor: 'var(--bg-elevated)',
          },
          '.cm-activeLine': {
            backgroundColor: 'var(--bg-hover)',
          },
          '.cm-cursor': {
            borderLeftColor: 'var(--accent-primary)',
          },
          '.cm-selectionBackground': {
            backgroundColor: 'var(--accent-muted) !important',
          },
        }),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap syntax highlighting when theme changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const style = theme === 'dark' ? darkHighlight : lightHighlight;
    view.dispatch({
      effects: highlightCompartment.current.reconfigure(syntaxHighlighting(style)),
    });
  }, [theme]);

  // Sync external content changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentContent = view.state.doc.toString();
    if (currentContent !== content) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: content,
        },
      });
    }
  }, [content]);

  // Insert text handler
  const insertText = useCallback((text: string) => {
    const view = viewRef.current;
    if (!view) return;

    const pos = view.state.selection.main.head;
    const needsNewline = pos > 0 && view.state.doc.sliceString(pos - 1, pos) !== '\n';
    const insert = (needsNewline ? '\n\n' : '') + text + '\n';

    view.dispatch({
      changes: { from: pos, insert },
      selection: { anchor: pos + insert.length },
    });
    view.focus();
  }, []);

  useEffect(() => {
    onInsertRef.current = insertText;
  }, [insertText, onInsertRef]);

  // Focus find input when showing
  useEffect(() => {
    if (showFind) {
      findInputRef.current?.focus();
    }
  }, [showFind]);

  // Find & Replace
  function handleFind(direction: 'next' | 'prev') {
    const view = viewRef.current;
    if (!view || !findText) return;

    const doc = view.state.doc.toString();
    let flags = 'g';
    if (!matchCase) flags += 'i';

    let pattern: string;
    if (useRegex) {
      pattern = findText;
    } else {
      pattern = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    if (matchWord) {
      pattern = `\\b${pattern}\\b`;
    }

    try {
      const regex = new RegExp(pattern, flags);
      const matches: { from: number; to: number }[] = [];
      let match;
      while ((match = regex.exec(doc)) !== null) {
        matches.push({ from: match.index, to: match.index + match[0].length });
        if (match[0].length === 0) break;
      }

      if (matches.length === 0) return;

      const cursor = view.state.selection.main.head;
      let targetIdx: number;

      if (direction === 'next') {
        targetIdx = matches.findIndex(m => m.from > cursor);
        if (targetIdx === -1) targetIdx = 0;
      } else {
        targetIdx = -1;
        for (let i = matches.length - 1; i >= 0; i--) {
          if (matches[i].from < cursor) {
            targetIdx = i;
            break;
          }
        }
        if (targetIdx === -1) targetIdx = matches.length - 1;
      }

      const target = matches[targetIdx];
      view.dispatch({
        selection: { anchor: target.from, head: target.to },
        scrollIntoView: true,
      });
      view.focus();
    } catch {
      // Invalid regex
    }
  }

  function handleReplace() {
    const view = viewRef.current;
    if (!view || !findText) return;

    const { from, to } = view.state.selection.main;
    if (from === to) {
      handleFind('next');
      return;
    }

    view.dispatch({
      changes: { from, to, insert: replaceText },
    });
    handleFind('next');
  }

  function handleReplaceAll() {
    const view = viewRef.current;
    if (!view || !findText) return;

    const doc = view.state.doc.toString();
    let flags = 'g';
    if (!matchCase) flags += 'i';

    let pattern: string;
    if (useRegex) {
      pattern = findText;
    } else {
      pattern = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    if (matchWord) {
      pattern = `\\b${pattern}\\b`;
    }

    try {
      const regex = new RegExp(pattern, flags);
      const newDoc = doc.replace(regex, replaceText);

      view.dispatch({
        changes: { from: 0, to: doc.length, insert: newDoc },
      });
    } catch {
      // Invalid regex
    }
  }

  // Get selection for context menu
  const getSelection = useCallback((): { text: string; from: number; to: number } | null => {
    const view = viewRef.current;
    if (!view) return null;

    const { from, to } = view.state.selection.main;
    if (from === to) return null;

    return {
      text: view.state.doc.sliceString(from, to),
      from,
      to,
    };
  }, []);

  // Apply format to selection
  const applyFormat = useCallback((prefix: string, suffix: string) => {
    const view = viewRef.current;
    if (!view) return;

    const sel = getSelection();
    if (!sel) return;

    const formatted = `${prefix}${sel.text}${suffix}`;
    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert: formatted },
      selection: { anchor: sel.from + prefix.length, head: sel.from + prefix.length + sel.text.length },
    });
    view.focus();
  }, [getSelection]);

  // Expose applyFormat for context menu
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__editorApplyFormat = applyFormat;
    (window as unknown as Record<string, unknown>).__editorGetSelection = getSelection;
    return () => {
      delete (window as unknown as Record<string, unknown>).__editorApplyFormat;
      delete (window as unknown as Record<string, unknown>).__editorGetSelection;
    };
  }, [applyFormat, getSelection]);

  const currentLine = viewRef.current
    ? viewRef.current.state.doc.lineAt(viewRef.current.state.selection.main.head).number
    : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className={styles.editorArea}>
        <div className={styles.editorPane} style={{ display: viewMode === 'editor' ? undefined : 'none' }}>
          <div className={styles.cmEditor} ref={editorRef} />
        </div>
        <div className={styles.previewPane} style={{ display: viewMode === 'preview' ? undefined : 'none' }}>
          <div className={styles.previewHeader}>Preview</div>
          <div className={styles.previewContent}>
            <MarkdownPreview source={content} />
          </div>
        </div>
      </div>

      {/* Find & Replace Bar */}
      {showFind && (
        <div className={styles.findBar}>
          <div className={styles.findRow}>
            <input
              ref={findInputRef}
              className={styles.findInput}
              value={findText}
              onChange={e => setFindText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleFind('next');
                if (e.key === 'Escape') onCloseFind();
              }}
              placeholder="Find"
            />
            <button className={styles.findButton} onClick={() => handleFind('next')}>next</button>
            <button className={styles.findButton} onClick={() => handleFind('prev')}>previous</button>
            <button className={styles.findButton} onClick={handleReplaceAll}>all</button>
            <div className={styles.findOptions}>
              <label className={styles.findCheckbox}>
                <input type="checkbox" checked={matchCase} onChange={e => setMatchCase(e.target.checked)} />
                match case
              </label>
              <label className={styles.findCheckbox}>
                <input type="checkbox" checked={useRegex} onChange={e => setUseRegex(e.target.checked)} />
                regexp
              </label>
              <label className={styles.findCheckbox}>
                <input type="checkbox" checked={matchWord} onChange={e => setMatchWord(e.target.checked)} />
                by word
              </label>
            </div>
            <button className={styles.findClose} onClick={onCloseFind}>×</button>
          </div>
          <div className={styles.findRow}>
            <input
              className={styles.findInput}
              value={replaceText}
              onChange={e => setReplaceText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleReplace();
                if (e.key === 'Escape') onCloseFind();
              }}
              placeholder="Replace"
            />
            <button className={`${styles.findButton} ${styles.findButtonPrimary}`} onClick={handleReplace}>
              replace
            </button>
            <button className={`${styles.findButton} ${styles.findButtonPrimary}`} onClick={handleReplaceAll}>
              replace all
            </button>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className={styles.statusBar}>
        <span className={styles.statusItem}>Words: {getWordCount(content)}</span>
        <span className={styles.statusItem}>Characters: {getCharCount(content)}</span>
        <div className={styles.statusSpacer} />
        <span className={styles.statusItem}>Size: {getFileSize(content)}</span>
        <span className={styles.statusItem}>Read time: {getReadTime(content)}</span>
        <span className={styles.statusItem}>Line: {currentLine}</span>
      </div>
    </div>
  );
}
