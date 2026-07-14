import { useEffect, useRef, memo } from 'react';
import { useMarkdown } from '../../hooks/useMarkdown';

interface MarkdownPreviewProps {
  source: string;
  onToggleCheckbox?: (newSource: string) => void;
}

// Mermaid (com o layout ELK) é uma das libs mais pesadas do bundle. Só a
// carregamos quando um documento realmente contém um diagrama — o import()
// é cacheado no primeiro uso e o loader ELK é registrado uma única vez.
type MermaidApi = typeof import('mermaid')['default'];
let mermaidPromise: Promise<MermaidApi> | null = null;
function loadMermaid(): Promise<MermaidApi> {
  if (!mermaidPromise) {
    mermaidPromise = Promise.all([
      import('mermaid'),
      import('@mermaid-js/layout-elk'),
    ]).then(([{ default: mermaid }, { default: elkLayouts }]) => {
      mermaid.registerLayoutLoaders(elkLayouts);
      return mermaid;
    });
  }
  return mermaidPromise;
}

const CHECKBOX_RE = /^[ \t]*\[[ xX]?\] - /;

function getIndent(line: string): number {
  return line.match(/^([ \t]*)/)?.[1]?.length ?? 0;
}

function toggleCheckboxInSource(source: string, index: number, isChecked: boolean): string {
  const lines = source.split('\n');

  // Collect the line index and indentation of every checkbox line
  const cbLines: Array<{ lineIdx: number; indent: number }> = [];
  lines.forEach((line, lineIdx) => {
    if (CHECKBOX_RE.test(line)) {
      cbLines.push({ lineIdx, indent: getIndent(line) });
    }
  });

  const target = cbLines[index];
  if (!target) return source;

  const setChecked = (lineIdx: number, checked: boolean) => {
    lines[lineIdx] = lines[lineIdx].replace(/\[[ xX]?\]/, checked ? '[x]' : '[]');
  };

  // Toggle the clicked checkbox
  setChecked(target.lineIdx, isChecked);

  // Cascade to direct children (subsequent entries with strictly greater indent)
  for (let i = index + 1; i < cbLines.length; i++) {
    if (cbLines[i].indent <= target.indent) break;
    setChecked(cbLines[i].lineIdx, isChecked);
  }

  // Find immediate parent (last entry before this one with strictly less indent)
  let parentIdx = -1;
  for (let i = index - 1; i >= 0; i--) {
    if (cbLines[i].indent < target.indent) {
      parentIdx = i;
      break;
    }
  }

  if (parentIdx >= 0) {
    const parent = cbLines[parentIdx];
    if (isChecked) {
      // Auto-complete parent if ALL siblings at this indent level are now checked
      const directSiblings: number[] = [];
      for (let i = parentIdx + 1; i < cbLines.length; i++) {
        if (cbLines[i].indent <= parent.indent) break;
        if (cbLines[i].indent === target.indent) directSiblings.push(i);
      }
      const allDone = directSiblings.every(si => /\[x\]/i.test(lines[cbLines[si].lineIdx]));
      if (allDone) setChecked(parent.lineIdx, true);
    } else {
      // Unchecking a child also unchecks the parent
      setChecked(parent.lineIdx, false);
    }
  }

  return lines.join('\n');
}

/**
 * GFM renders a task item as `<li class="task-list-item"><input> raw text</li>`,
 * with the label as a bare text node. Wrap that label (everything up to the first
 * nested list) in a `.task-label` span so it can be aligned and struck through
 * independently of any sub-tasks.
 */
function wrapTaskLabels(container: HTMLElement) {
  container.querySelectorAll<HTMLLIElement>('li.task-list-item').forEach((li) => {
    const checkbox = li.querySelector(':scope > input[type="checkbox"]');
    if (!checkbox) return;
    if (li.querySelector(':scope > .task-label')) return; // already wrapped

    const label = document.createElement('span');
    label.className = 'task-label';

    const toMove: ChildNode[] = [];
    let node = checkbox.nextSibling;
    while (node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = (node as HTMLElement).tagName;
        if (tag === 'UL' || tag === 'OL') break; // leave nested lists as siblings
      }
      toMove.push(node);
      node = node.nextSibling;
    }
    if (toMove.length === 0) return;
    toMove.forEach((n) => label.appendChild(n));
    checkbox.after(label);
  });
}

const LIGHT_THEMES = new Set([
  'paper', 'mist',
]);

function getMermaidTheme(): 'dark' | 'default' {
  const t = document.documentElement.getAttribute('data-theme') ?? '';
  return LIGHT_THEMES.has(t) ? 'default' : 'dark';
}

// Monotonic id so every mermaid.render() call gets a unique, DOM-safe target id.
let mermaidRenderId = 0;

/**
 * Replace a diagram container with a visible error box showing the message and
 * the raw Mermaid source, so a failed diagram is fixable instead of silently
 * vanishing. Built via textContent to keep the (untrusted) source inert.
 */
function renderMermaidError(container: HTMLElement, message: string, code: string) {
  container.className = 'mermaid-error';
  container.textContent = '';

  const header = document.createElement('div');
  header.className = 'mermaid-error-header';
  header.textContent = `Erro ao renderizar diagrama Mermaid — ${message}`;

  const pre = document.createElement('pre');
  pre.className = 'mermaid-error-code';
  const codeEl = document.createElement('code');
  codeEl.textContent = code;
  pre.appendChild(codeEl);

  container.append(header, pre);
}

function MarkdownPreviewImpl({ source, onToggleCheckbox }: MarkdownPreviewProps) {
  const html = useMarkdown(source);
  const ref = useRef<HTMLDivElement>(null);
  // Refs consultadas pelo listener de checkbox (anexado uma única vez) — mantêm
  // o source e o callback sempre atuais sem re-anexar o handler a cada render.
  const sourceRef = useRef(source);
  const onToggleRef = useRef(onToggleCheckbox);
  useEffect(() => { sourceRef.current = source; }, [source]);
  useEffect(() => { onToggleRef.current = onToggleCheckbox; }, [onToggleCheckbox]);

  useEffect(() => {
    const container = ref.current;
    if (!container || !html) return;

    // Set the HTML first
    container.innerHTML = html;
    wrapTaskLabels(container);

    // GFM renderiza os checkboxes como disabled; habilita-os quando há um
    // callback de toggle (fica só-leitura no modo foco, que não passa callback).
    if (onToggleCheckbox) {
      container.querySelectorAll('input[type="checkbox"]').forEach((cb) => cb.removeAttribute('disabled'));
    }

    const blocks = container.querySelectorAll<HTMLElement>('pre code.language-mermaid');
    if (!blocks.length) return;

    // Swap each mermaid code block for a container we render into individually.
    const targets: Array<{ container: HTMLDivElement; code: string }> = [];
    blocks.forEach((block) => {
      const pre = block.parentElement;
      if (!pre) return;
      const code = (block.textContent ?? '').trim();
      const el = document.createElement('div');
      el.className = 'mermaid-diagram';
      pre.replaceWith(el);
      targets.push({ container: el, code });
    });

    let cancelled = false;

    (async () => {
      // Carrega o Mermaid sob demanda (só há diagramas neste documento).
      const mermaid = await loadMermaid();
      if (cancelled) return;
      // Default layout (dagre) instead of forcing 'elk', which only supports
      // flowcharts and breaks other diagram types.
      mermaid.initialize({ startOnLoad: false, theme: getMermaidTheme() });

      for (const { container: diagram, code } of targets) {
        const id = `mmd-${mermaidRenderId++}`;
        try {
          // parse() catches most syntax errors cleanly, before render() touches the DOM.
          await mermaid.parse(code);
          const { svg } = await mermaid.render(id, code);
          if (cancelled) return;
          diagram.innerHTML = svg;
        } catch (err) {
          if (cancelled) return;
          const message = err instanceof Error ? err.message : String(err);
          // Render may leave an orphan measurement node behind on failure.
          document.getElementById(id)?.remove();
          document.getElementById(`d${id}`)?.remove();
          renderMermaidError(diagram, message, code);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [html, onToggleCheckbox]);

  // Um único listener delegado no container trata todos os checkboxes — evita
  // re-anexar N handlers a cada render e re-serializar o HTML do preview.
  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const onChange = (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return;
      const handler = onToggleRef.current;
      if (!handler) return;
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      const index = Array.prototype.indexOf.call(checkboxes, target);
      if (index === -1) return;
      handler(toggleCheckboxInSource(sourceRef.current, index, target.checked));
    };

    container.addEventListener('change', onChange);
    return () => container.removeEventListener('change', onChange);
  }, []);

  return (
    <div
      ref={ref}
      className="markdown-preview"
    />
  );
}

export const MarkdownPreview = memo(MarkdownPreviewImpl);
