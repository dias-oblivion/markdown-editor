import { useEffect, useRef, useCallback, useState } from 'react';
import { EditorView, keymap, highlightActiveLine } from '@codemirror/view';
import { EditorState, Compartment, Annotation } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { searchKeymap } from '@codemirror/search';
import type { ViewMode, ThemeId } from '../../types';
import { getWordCount, getCharCount, getFileSize, getReadTime } from '../../utils/markdown';
import { MarkdownPreview } from './MarkdownPreview';
import { SlashMenu } from '../SlashMenu/SlashMenu';
import { filterCommands, findCommandByWord, formatDate, type SlashCommand } from './slashCommands';
import styles from './Editor.module.css';

// Marca transações de sincronização programática (troca de aba / conteúdo externo),
// para o updateListener não confundir com edição do usuário e sujar a aba.
const External = Annotation.define<boolean>();

// ── Syntax highlighting themes ──
// Minimal palettes: pure-neutral text + slate accent + 2 muted hues.
// Dark serves ink/graphite; light serves paper/mist.

const darkHighlight = HighlightStyle.define([
  { tag: tags.comment, color: '#6a6a6a', fontStyle: 'italic' },
  { tag: tags.keyword, color: '#5b7fb8' },
  { tag: tags.string, color: '#8fa876' },
  { tag: tags.number, color: '#c2a06a' },
  { tag: tags.bool, color: '#c2a06a' },
  { tag: tags.operator, color: '#9a9a9a' },
  { tag: tags.function(tags.variableName), color: '#d6d6d6' },
  { tag: tags.definition(tags.variableName), color: '#d6d6d6' },
  { tag: tags.typeName, color: '#8fa876' },
  { tag: tags.propertyName, color: '#c2a06a' },
  { tag: tags.heading, color: '#5b7fb8', fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.link, color: '#5b7fb8', textDecoration: 'underline' },
  { tag: tags.url, color: '#5b7fb8' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.meta, color: '#9a9a9a' },
  { tag: tags.processingInstruction, color: '#5b7fb8' },
]);

const lightHighlight = HighlightStyle.define([
  { tag: tags.comment, color: '#9a9a9a', fontStyle: 'italic' },
  { tag: tags.keyword, color: '#3d6098' },
  { tag: tags.string, color: '#5e7a50' },
  { tag: tags.number, color: '#9a7430' },
  { tag: tags.bool, color: '#9a7430' },
  { tag: tags.operator, color: '#6a6a6a' },
  { tag: tags.function(tags.variableName), color: '#333333' },
  { tag: tags.definition(tags.variableName), color: '#1a1a1a' },
  { tag: tags.typeName, color: '#5e7a50' },
  { tag: tags.propertyName, color: '#9a7430' },
  { tag: tags.heading, color: '#3d6098', fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.link, color: '#3d6098', textDecoration: 'underline' },
  { tag: tags.url, color: '#3d6098' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.meta, color: '#6a6a6a' },
  { tag: tags.processingInstruction, color: '#3d6098' },
]);

function getHighlightStyle(activeTheme: ThemeId): HighlightStyle {
  switch (activeTheme) {
    case 'paper':
    case 'mist':  return lightHighlight;
    default:      return darkHighlight; // ink, graphite
  }
}

interface EditorProps {
  content: string;
  viewMode: ViewMode;
  activeTheme: ThemeId;
  onChange: (content: string) => void;
  onInsertRef: React.MutableRefObject<((text: string) => void) | null>;
  showFind: boolean;
  onCloseFind: () => void;
  /** Comandos slash: abrir o diálogo de tabela. */
  onSlashTable?: () => void;
  /** Comandos slash: abrir o diálogo de bloco de código. */
  onSlashCode?: () => void;
  /** Comandos slash: enviar (ou só abrir) o assistente de IA. */
  onSlashAI?: (prompt: string) => void;
}

// Estado do menu de comandos slash (aberto = não-nulo).
interface SlashState {
  /** Posição absoluta do `/` no documento. */
  from: number;
  query: string;
  mode: 'list' | 'arg';
  argText: string;
  items: SlashCommand[];
  index: number;
  /** Coordenadas de viewport para ancorar o menu. */
  pos: { left: number; top: number };
}

export function Editor({ content, viewMode, activeTheme, onChange, onInsertRef, showFind, onCloseFind, onSlashTable, onSlashCode, onSlashAI }: EditorProps) {
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

  // ── Comandos slash ──
  const [slash, setSlash] = useState<SlashState | null>(null);
  const slashRef = useRef<SlashState | null>(null);
  // O updateListener do CodeMirror é criado uma única vez no mount; ele consulta
  // esta ref para recalcular o menu, sempre apontando à versão mais recente.
  const recomputeSlashRef = useRef<(view: EditorView) => void>(() => {});
  // Ações do menu consultadas pelo handler de teclado (evita re-subscrição a cada tecla).
  const slashActionsRef = useRef<{
    move: (dir: number) => void;
    execute: (st: SlashState) => void;
    close: () => void;
  }>({
    move: () => {},
    execute: () => {},
    close: () => {},
  });

  // Always keep ref pointing to latest onChange
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorRef.current) return;

    const initialStyle = getHighlightStyle(activeTheme);

    const state = EditorState.create({
      doc: content,
      extensions: [
        highlightActiveLine(),
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
          // Só propaga edições reais do usuário; ignora syncs programáticos anotados
          if (update.docChanged && !update.transactions.some(tr => tr.annotation(External))) {
            onChangeRef.current(update.state.doc.toString());
          }
          // Recalcula o menu de comandos slash a cada mudança de doc ou cursor
          if (update.docChanged || update.selectionSet) {
            recomputeSlashRef.current(update.view);
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
            // Faz a área editável ocupar toda a altura visível já numa nota nova/curta
            minHeight: '100%',
          },
          '.cm-scroller': {
            fontFamily: 'var(--font-mono)',
            fontSize: '14px',
            lineHeight: '1.6',
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

    const style = getHighlightStyle(activeTheme);
    view.dispatch({
      effects: highlightCompartment.current.reconfigure(syntaxHighlighting(style)),
    });
  }, [activeTheme]);

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
        annotations: External.of(true),
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

  // ── Comandos slash: detecção, execução e teclado ──

  // Recalcula o menu a partir do estado atual do editor.
  const recomputeSlash = useCallback((view: EditorView) => {
    const sel = view.state.selection.main;
    if (!sel.empty) { setSlash(null); return; }

    const head = sel.head;
    const line = view.state.doc.lineAt(head);
    const before = line.text.slice(0, head - line.from);

    // Último '/' precedido por início-de-linha ou espaço (ignora URLs/paths tipo http:// e a/b)
    let slashCol = -1;
    for (let i = before.length - 1; i >= 0; i--) {
      if (before[i] === '/' && (i === 0 || /\s/.test(before[i - 1]))) {
        slashCol = i;
        break;
      }
    }
    if (slashCol === -1) { setSlash(null); return; }

    const raw = before.slice(slashCol + 1);
    const from = line.from + slashCol;
    const spaceIdx = raw.indexOf(' ');

    let mode: 'list' | 'arg';
    let items: SlashCommand[];
    let query = '';
    let argText = '';

    if (spaceIdx === -1) {
      // Modo lista: filtra comandos pelo que foi digitado
      if (raw.length > 32) { setSlash(null); return; }
      query = raw;
      items = filterCommands(raw);
      if (items.length === 0) { setSlash(null); return; }
      mode = 'list';
    } else {
      // Modo argumento: só sobrevive se a 1ª palavra for um comando que aceita argumento (/ia)
      const cmd = findCommandByWord(raw.slice(0, spaceIdx));
      if (!cmd || !cmd.acceptsArg) { setSlash(null); return; }
      items = [cmd];
      argText = raw.slice(spaceIdx + 1);
      mode = 'arg';
    }

    const coords = view.coordsAtPos(from);
    if (!coords) { setSlash(null); return; }
    const pos = { left: coords.left, top: coords.bottom + 4 };

    setSlash(prev => {
      // Preserva o índice destacado quando continua em modo lista
      const index =
        prev && prev.mode === 'list' && mode === 'list'
          ? Math.min(prev.index, items.length - 1)
          : 0;
      return { from, query, mode, argText, items, index, pos };
    });
  }, []);

  // Executa o comando destacado (ou clicado).
  const executeSlash = useCallback((st: SlashState) => {
    const view = viewRef.current;
    if (!view) { setSlash(null); return; }

    const cmd = st.mode === 'arg' ? st.items[0] : st.items[st.index];
    if (!cmd) { setSlash(null); return; }

    const to = view.state.selection.main.head;
    const from = st.from;

    switch (cmd.kind) {
      case 'date-short':
      case 'date-long':
      case 'datetime': {
        const text = formatDate(cmd.kind);
        view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length } });
        view.focus();
        break;
      }
      case 'table':
        // Remove o `/…` e delega ao diálogo, que insere na posição do cursor via pipeline existente
        view.dispatch({ changes: { from, to, insert: '' }, selection: { anchor: from } });
        onSlashTable?.();
        break;
      case 'code':
        view.dispatch({ changes: { from, to, insert: '' }, selection: { anchor: from } });
        onSlashCode?.();
        break;
      case 'ai':
        view.dispatch({ changes: { from, to, insert: '' }, selection: { anchor: from } });
        view.focus();
        onSlashAI?.(st.argText.trim());
        break;
    }

    setSlash(null);
  }, [onSlashTable, onSlashCode, onSlashAI]);

  // Mantém as refs consultadas por closures de longa duração (updateListener, keydown)
  // sempre atualizadas — feito em effects para não escrever refs durante o render.
  useEffect(() => { slashRef.current = slash; }, [slash]);
  useEffect(() => { recomputeSlashRef.current = recomputeSlash; }, [recomputeSlash]);
  useEffect(() => {
    slashActionsRef.current = {
      move: (dir: number) =>
        setSlash(s => {
          if (!s) return s;
          const len = s.mode === 'arg' ? 1 : s.items.length;
          return { ...s, index: (s.index + dir + len) % len };
        }),
      execute: executeSlash,
      close: () => setSlash(null),
    };
  }, [executeSlash]);

  const slashActive = slash !== null;

  // Navegação por teclado — captura no ancestral do .cm-content, antes do CodeMirror
  useEffect(() => {
    if (!slashActive) return;
    const el = editorRef.current;
    if (!el) return;

    function onKeyDown(e: KeyboardEvent) {
      const st = slashRef.current;
      if (!st) return;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault(); e.stopPropagation();
          slashActionsRef.current.move(1);
          break;
        case 'ArrowUp':
          e.preventDefault(); e.stopPropagation();
          slashActionsRef.current.move(-1);
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault(); e.stopPropagation();
          slashActionsRef.current.execute(st);
          break;
        case 'Escape':
          e.preventDefault(); e.stopPropagation();
          slashActionsRef.current.close();
          break;
      }
    }

    el.addEventListener('keydown', onKeyDown, true);
    return () => el.removeEventListener('keydown', onKeyDown, true);
  }, [slashActive]);

  // Fecha o menu ao clicar fora ou rolar o editor
  useEffect(() => {
    if (!slashActive) return;

    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-slash-menu]')) return;
      setSlash(null);
    }
    const scroller = editorRef.current?.querySelector('.cm-scroller');
    const onScroll = () => setSlash(null);

    document.addEventListener('mousedown', onDocMouseDown, true);
    scroller?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown, true);
      scroller?.removeEventListener('scroll', onScroll);
    };
  }, [slashActive]);

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

  // Apply (or toggle off) format on selection
  const applyFormat = useCallback((prefix: string, suffix: string) => {
    const view = viewRef.current;
    if (!view) return;

    const sel = getSelection();
    if (!sel) return;

    const { from, to, text } = sel;
    const doc = view.state.doc;

    // Case 1: markers are inside the selection (e.g. user selected "**texto**")
    if (
      text.length >= prefix.length + suffix.length &&
      text.startsWith(prefix) &&
      text.endsWith(suffix)
    ) {
      const inner = text.slice(prefix.length, text.length - suffix.length);
      view.dispatch({
        changes: { from, to, insert: inner },
        selection: { anchor: from, head: from + inner.length },
      });
      view.focus();
      return;
    }

    // Case 2: markers surround the selection (typical after the first toggle)
    const before = doc.sliceString(Math.max(0, from - prefix.length), from);
    const after = doc.sliceString(to, Math.min(doc.length, to + suffix.length));
    if (before === prefix && after === suffix) {
      view.dispatch({
        changes: { from: from - prefix.length, to: to + suffix.length, insert: text },
        selection: { anchor: from - prefix.length, head: from - prefix.length + text.length },
      });
      view.focus();
      return;
    }

    // Otherwise: wrap the selection
    const formatted = `${prefix}${text}${suffix}`;
    view.dispatch({
      changes: { from, to, insert: formatted },
      selection: { anchor: from + prefix.length, head: from + prefix.length + text.length },
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className={styles.editorArea}>
        <div className={styles.editorPane} style={{ display: viewMode === 'editor' ? undefined : 'none' }}>
          <div className={styles.cmEditor} ref={editorRef} />
        </div>
        <div className={styles.previewPane} style={{ display: viewMode === 'preview' ? undefined : 'none' }}>
          <div className={styles.previewHeader}>Preview</div>
          <div className={styles.previewContent}>
            <MarkdownPreview
              source={content}
              onToggleCheckbox={viewMode === 'preview' ? (newSource) => onChangeRef.current(newSource) : undefined}
            />
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
        <span className={styles.statusItem}>
          <span className={styles.statusHighlight}>{getWordCount(content)}</span> words
        </span>
        <span className={styles.statusDivider} />
        <span className={styles.statusItem}>
          <span className={styles.statusHighlight}>{getCharCount(content)}</span> chars
        </span>
        <div className={styles.statusSpacer} />
        <span className={styles.statusItem}>{getFileSize(content)}</span>
        <span className={styles.statusDivider} />
        <span className={styles.statusItem}>{getReadTime(content)} read</span>
      </div>

      {/* Menu de comandos slash (posição fixed — escapa do overflow dos contêineres) */}
      {slash && (
        <SlashMenu
          items={slash.items}
          activeIndex={slash.index}
          pos={slash.pos}
          mode={slash.mode}
          argText={slash.argText}
          onSelect={(i) => {
            executeSlash(slash.mode === 'arg' ? slash : { ...slash, index: i });
          }}
          onHover={(i) => setSlash(s => (s ? { ...s, index: i } : s))}
        />
      )}
    </div>
  );
}
