import { useState, useEffect, useCallback } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
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
      setHtml(String(result));
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
