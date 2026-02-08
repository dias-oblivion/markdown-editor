import type { FormatAction, TableConfig, CodeBlockConfig } from '../types';

const FORMAT_MAP: Record<FormatAction, { prefix: string; suffix: string }> = {
  bold: { prefix: '**', suffix: '**' },
  italic: { prefix: '_', suffix: '_' },
  highlight: { prefix: '==', suffix: '==' },
  strikethrough: { prefix: '~~', suffix: '~~' },
  superscript: { prefix: '<sup>', suffix: '</sup>' },
  subscript: { prefix: '<sub>', suffix: '</sub>' },
};

export function applyFormat(text: string, action: FormatAction): string {
  const { prefix, suffix } = FORMAT_MAP[action];
  return `${prefix}${text}${suffix}`;
}

export function generateTable(config: TableConfig): string {
  const { cols, headers, data } = config;
  const lines: string[] = [];

  // Header row
  lines.push('| ' + headers.map(h => h || ' ').join(' | ') + ' |');

  // Separator
  lines.push('| ' + Array(cols).fill('---').join(' | ') + ' |');

  // Data rows
  for (const row of data) {
    lines.push('| ' + row.map(cell => cell || ' ').join(' | ') + ' |');
  }

  return lines.join('\n');
}

export function generateCodeBlock(config: CodeBlockConfig): string {
  const { language, code } = config;
  return `\`\`\`${language}\n${code}\n\`\`\``;
}

export function getWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function getCharCount(text: string): number {
  return text.length;
}

export function getLineCount(text: string): number {
  return text.split('\n').length;
}

export function getReadTime(text: string): string {
  const words = getWordCount(text);
  const minutes = Math.ceil(words / 200);
  return `${minutes} min`;
}

export function getFileSize(text: string): string {
  const bytes = new Blob([text]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
