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

const LIGHT_THEMES = new Set([
  'matte-white', 'github-light', 'quiet-light', 'solarized-light', 'gruvbox-light',
]);

function getMermaidTheme(): 'dark' | 'default' {
  const t = document.documentElement.getAttribute('data-theme') ?? '';
  return LIGHT_THEMES.has(t) ? 'default' : 'dark';
}

export function MarkdownPreview({ source, onToggleCheckbox }: MarkdownPreviewProps) {
  const html = useMarkdown(source);
  const ref = useRef<HTMLDivElement>(null);
  const [processedHtml, setProcessedHtml] = useState<string>('');

  useEffect(() => {
    if (!ref.current || !html) return;

    // Set the HTML first
    ref.current.innerHTML = html;

    const blocks = ref.current.querySelectorAll<HTMLElement>('pre code.language-mermaid');
    if (!blocks.length) {
      setProcessedHtml(html);
      return;
    }

    mermaid.initialize({ startOnLoad: false, theme: getMermaidTheme(), layout: 'elk' });

    blocks.forEach((block) => {
      const pre = block.parentElement;
      if (!pre) return;

      const code = block.textContent ?? '';
      const container = document.createElement('div');
      container.className = 'mermaid mermaid-diagram';
      container.textContent = code;
      pre.replaceWith(container);
    });

    const mermaidNodes = ref.current.querySelectorAll<HTMLElement>('.mermaid');

    mermaid
      .run({ nodes: Array.from(mermaidNodes) })
      .then(() => {
        if (ref.current) {
          setProcessedHtml(ref.current.innerHTML);
        }
      })
      .catch(console.error);
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
