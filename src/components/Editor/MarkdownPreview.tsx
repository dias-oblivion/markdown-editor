import { useMarkdown } from '../../hooks/useMarkdown';

interface MarkdownPreviewProps {
  source: string;
}

export function MarkdownPreview({ source }: MarkdownPreviewProps) {
  const html = useMarkdown(source);

  return (
    <div
      className="markdown-preview"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
