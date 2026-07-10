import { useState, useEffect, useCallback } from 'react';
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

  const parse = useCallback(async (text: string) => {
    try {
      const result = await processor.process(normalizeCheckboxSyntax(text));
      // The pipeline lets raw HTML/SVG through (allowDangerousHtml) and the
      // preview injects it via innerHTML, so sanitize before it renders.
      // html + svg profiles keep task-list inputs, Prism/mermaid code blocks
      // and legitimate SVG diagrams, while stripping <script>, on*= handlers, etc.
      const clean = DOMPurify.sanitize(String(result), {
        USE_PROFILES: { html: true, svg: true, svgFilters: true },
      });
      setHtml(clean);
    } catch {
      setHtml('<p style="color: var(--danger);">Error parsing markdown</p>');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      parse(source);
    }, 150); // debounce

    return () => clearTimeout(timer);
  }, [source, parse]);

  return html;
}
