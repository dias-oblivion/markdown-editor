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

/**
 * CommonMark cannot keep a raw HTML block that contains blank lines — a blank
 * line ends the HTML block. So a multi-line inline `<svg>` with blank lines
 * between its sections (exactly how AI-generated diagrams are formatted) gets
 * shredded into paragraphs, injecting stray `<p>`/`</p>` tags in the middle of
 * the SVG. When that HTML is later parsed, the stray `</p>` forces the parser
 * out of SVG foreign content, so every element after the first blank line lands
 * in the HTML namespace — where DOMPurify strips it as an invalid SVG tag. The
 * result is an empty diagram, and the shredding can take out following blocks
 * (e.g. a ```mermaid fence) as collateral.
 *
 * Fix the source before parsing: collapse blank lines *inside* each
 * `<svg>…</svg>` and isolate the block with blank lines so it parses as one
 * intact HTML block. Whitespace inside SVG is insignificant, so the rendered
 * output is identical — we only touch what we display, never the file on disk.
 */
function normalizeInlineSvg(text: string): string {
  return text
    // Collapse blank lines within each <svg>…</svg> so it stays a single block.
    .replace(/<svg[\s\S]*?<\/svg>/gi, (block) => block.replace(/\n(?:[ \t]*\n)+/g, '\n'))
    // Ensure a blank line *before* <svg> so it isn't folded into a paragraph.
    .replace(/([^\n])\n(<svg[\s>])/gi, '$1\n\n$2')
    // Ensure a blank line *after* </svg> so following markdown stays separate.
    .replace(/(<\/svg>)\n([^\n])/gi, '$1\n\n$2');
}

export function useMarkdown(source: string) {
  const [html, setHtml] = useState('');

  const parse = useCallback(async (text: string) => {
    try {
      const result = await processor.process(normalizeInlineSvg(normalizeCheckboxSyntax(text)));
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
