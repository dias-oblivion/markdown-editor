import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import elkLayouts from '@mermaid-js/layout-elk';
import { useMarkdown } from '../../hooks/useMarkdown';

interface MarkdownPreviewProps {
  source: string;
  onToggleCheckbox?: (newSource: string) => void;
}

mermaid.registerLayoutLoaders(elkLayouts);

function getMermaidTheme(): 'dark' | 'default' {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'default' : 'dark';
}

export function MarkdownPreview({ source, onToggleCheckbox }: MarkdownPreviewProps) {
  const html = useMarkdown(source);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !html) return;

    const blocks = ref.current.querySelectorAll<HTMLElement>('pre code.language-mermaid');
    if (!blocks.length) return;

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

    mermaid
      .run({ nodes: Array.from(ref.current.querySelectorAll<HTMLElement>('.mermaid')) })
      .catch(console.error);
  }, [html]);

  useEffect(() => {
    if (!ref.current || !onToggleCheckbox) return;

    const checkboxes = ref.current.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    checkboxes.forEach((checkbox, index) => {
      checkbox.removeAttribute('disabled');
      checkbox.addEventListener('change', () => {
        const matches = [...source.matchAll(/^[ \t]*[-*+] \[[ xX]\]/gm)];
        const match = matches[index];
        if (!match || match.index === undefined) return;

        const isChecked = checkbox.checked;
        const bracketOpen = match.index + match[0].indexOf('[');
        const bracketClose = match.index + match[0].indexOf(']');
        const newSource =
          source.slice(0, bracketOpen) +
          (isChecked ? '[x]' : '[ ]') +
          source.slice(bracketClose + 1);

        onToggleCheckbox(newSource);
      });
    });
  }, [html, source, onToggleCheckbox]);

  return (
    <div
      ref={ref}
      className="markdown-preview"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
