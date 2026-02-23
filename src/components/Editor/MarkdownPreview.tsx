import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import elkLayouts from '@mermaid-js/layout-elk';
import { useMarkdown } from '../../hooks/useMarkdown';

interface MarkdownPreviewProps {
  source: string;
}

mermaid.registerLayoutLoaders(elkLayouts);

function getMermaidTheme(): 'dark' | 'default' {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'default' : 'dark';
}

export function MarkdownPreview({ source }: MarkdownPreviewProps) {
  const html = useMarkdown(source);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !html) return;

    const blocks = ref.current.querySelectorAll<HTMLElement>('pre code.language-mermaid');
    if (!blocks.length) return;

    mermaid.initialize({ startOnLoad: false, theme: getMermaidTheme(), layout: 'elk' });

    // Substitui cada <pre><code class="language-mermaid"> por um <div class="mermaid mermaid-diagram">
    // mermaid.run() espera encontrar elementos com class="mermaid" no DOM para renderizar in-place
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

  return (
    <div
      ref={ref}
      className="markdown-preview"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
