import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import elkLayouts from '@mermaid-js/layout-elk';
import { useMarkdown } from '../../hooks/useMarkdown';

interface MarkdownPreviewProps {
  source: string;
  onToggleCheckbox?: (newSource: string) => void;
}

mermaid.registerLayoutLoaders(elkLayouts);

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

export function MarkdownPreview({ source, onToggleCheckbox }: MarkdownPreviewProps) {
  const html = useMarkdown(source);
  const ref = useRef<HTMLDivElement>(null);
  const [processedHtml, setProcessedHtml] = useState<string>('');

  useEffect(() => {
    if (!ref.current || !html) return;

    // Set the HTML first
    ref.current.innerHTML = html;
    wrapTaskLabels(ref.current);

    const blocks = ref.current.querySelectorAll<HTMLElement>('pre code.language-mermaid');
    if (!blocks.length) {
      setProcessedHtml(html);
      return;
    }

    // Default layout (dagre) instead of forcing 'elk', which only supports
    // flowcharts and breaks other diagram types.
    mermaid.initialize({ startOnLoad: false, theme: getMermaidTheme() });

    // Swap each mermaid code block for a container we render into individually.
    const targets: Array<{ container: HTMLDivElement; code: string }> = [];
    blocks.forEach((block) => {
      const pre = block.parentElement;
      if (!pre) return;
      const code = (block.textContent ?? '').trim();
      const container = document.createElement('div');
      container.className = 'mermaid-diagram';
      pre.replaceWith(container);
      targets.push({ container, code });
    });

    let cancelled = false;

    (async () => {
      for (const { container, code } of targets) {
        const id = `mmd-${mermaidRenderId++}`;
        try {
          // parse() catches most syntax errors cleanly, before render() touches the DOM.
          await mermaid.parse(code);
          const { svg } = await mermaid.render(id, code);
          if (cancelled) return;
          container.innerHTML = svg;
        } catch (err) {
          if (cancelled) return;
          const message = err instanceof Error ? err.message : String(err);
          // Render may leave an orphan measurement node behind on failure.
          document.getElementById(id)?.remove();
          document.getElementById(`d${id}`)?.remove();
          renderMermaidError(container, message, code);
        }
      }
      if (!cancelled && ref.current) {
        setProcessedHtml(ref.current.innerHTML);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [html]);

  useEffect(() => {
    if (!ref.current || !onToggleCheckbox || !processedHtml) return;

    const checkboxes = ref.current.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    const handlers: Array<() => void> = [];

    checkboxes.forEach((checkbox, index) => {
      checkbox.removeAttribute('disabled');
      const handler = () => {
        const isChecked = checkbox.checked;
        const newSource = toggleCheckboxInSource(source, index, isChecked);
        onToggleCheckbox(newSource);
      };
      handlers.push(handler);
      checkbox.addEventListener('change', handler);
    });

    return () => {
      checkboxes.forEach((checkbox, index) => {
        checkbox.removeEventListener('change', handlers[index]);
      });
    };
  }, [processedHtml, source, onToggleCheckbox]);

  return (
    <div
      ref={ref}
      className="markdown-preview"
    />
  );
}
