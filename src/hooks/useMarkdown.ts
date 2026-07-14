import { useState, useEffect, useCallback, useRef } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypePrism from 'rehype-prism-plus';
import rehypeStringify from 'rehype-stringify';
import DOMPurify from 'dompurify';

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypePrism, { ignoreMissing: true })
  .use(rehypeStringify, { allowDangerousHtml: true });

function normalizeCheckboxSyntax(text: string): string {
  return text
    .replace(/^([ \t]*)\[x\] - /gim, '$1- [x] ')
    .replace(/^([ \t]*)\[\] - /gm, '$1- [ ] ');
}

export function useMarkdown(source: string) {
  const [html, setHtml] = useState('');
  // Monotônico: cada parse recebe um token; só o mais recente pode gravar o
  // resultado, evitando que uma execução antiga (mais lenta) sobrescreva a nova.
  const runIdRef = useRef(0);
  // Primeira execução (mount / entrada no preview) roda sem esperar o debounce.
  const firstRunRef = useRef(true);

  const parse = useCallback(async (text: string, runId: number) => {
    try {
      const result = await processor.process(normalizeCheckboxSyntax(text));
      if (runId !== runIdRef.current) return;
      // The pipeline lets raw HTML/SVG through (allowDangerousHtml) and the
      // preview injects it via innerHTML, so sanitize before it renders.
      // html + svg profiles keep task-list inputs, Prism/mermaid code blocks
      // and legitimate SVG diagrams, while stripping <script>, on*= handlers, etc.
      const clean = DOMPurify.sanitize(String(result), {
        USE_PROFILES: { html: true, svg: true, svgFilters: true },
      });
      if (runId !== runIdRef.current) return;
      setHtml(clean);
    } catch {
      if (runId !== runIdRef.current) return;
      setHtml('<p style="color: var(--danger);">Error parsing markdown</p>');
    }
  }, []);

  useEffect(() => {
    const runId = ++runIdRef.current;

    // Só o primeiro parse é imediato; digitação subsequente respeita o debounce.
    if (firstRunRef.current) {
      firstRunRef.current = false;
      parse(source, runId);
      return;
    }

    const timer = setTimeout(() => {
      parse(source, runId);
    }, 150); // debounce

    return () => clearTimeout(timer);
  }, [source, parse]);

  return html;
}
