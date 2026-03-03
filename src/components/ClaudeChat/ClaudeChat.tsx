import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { useClaudeChat } from '../../hooks/useClaudeChat';
import type { ChatMessage } from '../../types';
import styles from './ClaudeChat.module.css';

interface ClaudeChatProps {
  visible: boolean;
  onClose: () => void;
  activeContent: string;
  activeFileName: string;
  workspacePath?: string;
  onInsertToEditor: (content: string) => void;
  onSaveAsNewFile: (content: string, suggestedName: string) => void;
}

const SUGGESTIONS = [
  { icon: 'codicon:eye', text: 'Resuma os pontos principais' },
  { icon: 'codicon:comment-discussion', text: 'O que posso melhorar neste texto?' },
  { icon: 'codicon:question', text: 'Explique este conteúdo' },
];

const PRESETS = [
  {
    id: 'rewriter',
    label: 'Reescrever',
    icon: 'codicon:edit',
    prompt: (content: string) =>
      `Reescreva o seguinte conteúdo markdown de forma profissional e detalhada, mantendo todas as informações:\n\n${content}`,
  },
  {
    id: 'brainstorm',
    label: 'Brainstorm',
    icon: 'codicon:lightbulb',
    prompt: (content: string) =>
      `Com base neste conteúdo markdown, gere 5 ideias criativas e perspectivas alternativas:\n\n${content}`,
  },
  {
    id: 'diagram',
    label: 'Diagrama',
    icon: 'codicon:type-hierarchy-sub',
    prompt: (content: string) =>
      `Analise este conteúdo e gere um diagrama Mermaid representando os conceitos-chave:\n\n${content}`,
  },
  {
    id: 'tasks',
    label: 'Tarefas',
    icon: 'codicon:checklist',
    prompt: (content: string) =>
      `Converta este conteúdo em uma lista de tarefas estruturada com checkboxes markdown:\n\n${content}`,
  },
];

function ClaudeIconSvg({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M17.304 1.273c-1.26-.407-2.656-.125-3.656.782L6.895 8.427c-.984.893-1.328 2.278-.868 3.521l1.618 4.437c.336.92.188 1.945-.394 2.726l-1.782 2.38a.75.75 0 0 0 1.199.899l1.782-2.38c.863-1.152 1.092-2.668.61-4.02L7.442 11.57c-.293-.803-.077-1.699.547-2.27l6.753-6.372a2.44 2.44 0 0 1 2.308-.494c.795.257 1.375.937 1.5 1.766l.977 6.419c.165 1.088-.237 2.18-1.057 2.9L11.22 19.6a.75.75 0 0 0 1.007 1.113l7.25-6.08c1.194-1.001 1.79-2.568 1.551-4.123l-.977-6.42a3.937 3.937 0 0 0-2.747-2.817Z"
        fill="currentColor"
      />
      <path
        d="M4.577 6.289a.75.75 0 0 0-1.154.955l2.165 2.617a2.44 2.44 0 0 1 .494 2.308l-2.013 6.22a3.937 3.937 0 0 0 2.014 4.75c1.165.563 2.556.47 3.634-.24l7.03-4.618a.75.75 0 1 0-.816-1.26l-7.03 4.618a2.44 2.44 0 0 1-2.255.15 2.437 2.437 0 0 1-1.247-2.943l2.013-6.22c.386-1.192.065-2.5-.826-3.578L4.577 6.29Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Parse a text segment for inline markdown: **bold**, *italic*, `code`
function InlineText({ text }: { text: string }) {
  // Split on bold, italic, inline code
  const tokens = text.split(/(\*\*[\s\S]+?\*\*|\*[\s\S]+?\*|`[^`]+`)/g);
  return (
    <>
      {tokens.map((tok, i) => {
        if (tok.startsWith('**') && tok.endsWith('**')) {
          return <strong key={i}>{tok.slice(2, -2)}</strong>;
        }
        if (tok.startsWith('*') && tok.endsWith('*')) {
          return <em key={i}>{tok.slice(1, -1)}</em>;
        }
        if (tok.startsWith('`') && tok.endsWith('`')) {
          return <code key={i} className={styles.inlineCode}>{tok.slice(1, -1)}</code>;
        }
        return <span key={i}>{tok}</span>;
      })}
    </>
  );
}

// Renders a single line with block-level markdown support
function RenderLine({ line }: { line: string }) {
  // Headings
  const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
  if (headingMatch) {
    const level = headingMatch[1].length;
    const cls = level === 1 ? styles.msgH1 : level === 2 ? styles.msgH2 : styles.msgH3;
    return <span className={cls}><InlineText text={headingMatch[2]} /></span>;
  }
  // Unordered list item
  const ulMatch = line.match(/^[-*+]\s+(.*)/);
  if (ulMatch) {
    return (
      <span className={styles.msgListItem}>
        <span className={styles.msgBullet}>•</span>
        <InlineText text={ulMatch[1]} />
      </span>
    );
  }
  // Ordered list item
  const olMatch = line.match(/^(\d+)\.\s+(.*)/);
  if (olMatch) {
    return (
      <span className={styles.msgListItem}>
        <span className={styles.msgListNum}>{olMatch[1]}.</span>
        <InlineText text={olMatch[2]} />
      </span>
    );
  }
  // Blockquote
  const bqMatch = line.match(/^>\s*(.*)/);
  if (bqMatch) {
    return <span className={styles.msgBlockquote}><InlineText text={bqMatch[1] || ''} /></span>;
  }
  // Horizontal rule
  if (/^---+$/.test(line) || /^\*\*\*+$/.test(line)) {
    return <span className={styles.msgHr} />;
  }
  return <InlineText text={line} />;
}

// Renders message content — handles fenced code blocks and block-level markdown
function MessageContent({ content }: { content: string }) {
  if (!content) {
    return (
      <span className={styles.typingDots}>
        <span /><span /><span />
      </span>
    );
  }

  // Split on triple-backtick code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className={styles.messageText}>
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const firstLine = part.slice(3).split('\n')[0].trim();
          const code = part.slice(3 + firstLine.length).trimStart().replace(/```$/, '').trimEnd();
          return (
            <div key={i} className={styles.codeBlock}>
              {firstLine && <div className={styles.codeLang}>{firstLine}</div>}
              <pre className={styles.codePre}><code>{code}</code></pre>
            </div>
          );
        }
        // Render line-by-line with block-level formatting
        const lines = part.split('\n');
        return (
          <div key={i} className={styles.textSegment}>
            {lines.map((line, j) => {
              if (!line.trim()) {
                return j < lines.length - 1 ? <div key={j} className={styles.msgEmptyLine} /> : null;
              }
              return (
                <div key={j} className={styles.msgLine}>
                  <RenderLine line={line} />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({
  message,
  onInsert,
  onSaveAsNew,
  suggestedName,
}: {
  message: ChatMessage;
  onInsert: (content: string) => void;
  onSaveAsNew: (content: string, name: string) => void;
  suggestedName: string;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  function handleCopy() {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={`${styles.messageWrapper} ${isUser ? styles.userWrapper : styles.assistantWrapper}`}>
      {/* Avatar */}
      <div className={`${styles.avatar} ${isUser ? styles.userAvatar : styles.claudeAvatar}`}>
        {isUser
          ? <Icon icon="codicon:account" width={14} />
          : <ClaudeIconSvg size={14} />
        }
      </div>

      <div className={styles.messageBubble}>
        {/* Header: role + time */}
        <div className={styles.messageHeader}>
          <span className={`${styles.messageRole} ${isUser ? styles.userRole : styles.claudeRole}`}>
            {isUser ? 'Você' : 'Claude'}
          </span>
          <span className={styles.messageTime}>{formatTime(message.timestamp)}</span>
        </div>

        {/* Content */}
        <div className={[
          styles.messageContent,
          isUser ? styles.userContent : styles.assistantContent,
          !isUser && message.content.startsWith('❌') ? styles.errorContent : '',
        ].filter(Boolean).join(' ')}>
          <MessageContent content={message.content} />
        </div>

        {/* Actions (only for successful assistant messages) */}
        {!isUser && message.content && !message.content.startsWith('❌') && (
          <div className={styles.messageActions}>
            <button className={styles.actionBtn} onClick={() => onInsert(message.content)} title="Inserir no editor">
              <Icon icon="codicon:insert" width={11} />
              Inserir
            </button>
            <button className={styles.actionBtn} onClick={() => onSaveAsNew(message.content, suggestedName)} title="Salvar como novo arquivo">
              <Icon icon="codicon:save" width={11} />
              Salvar como
            </button>
            <button className={`${styles.actionBtn} ${copied ? styles.actionBtnSuccess : ''}`} onClick={handleCopy} title="Copiar">
              <Icon icon={copied ? 'codicon:check' : 'codicon:copy'} width={11} />
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ClaudeChat({
  visible,
  onClose,
  activeContent,
  activeFileName,
  workspacePath,
  onInsertToEditor,
  onSaveAsNewFile,
}: ClaudeChatProps) {
  const { messages, isLoading, sendMessage, clearHistory } = useClaudeChat({ workspacePath });
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasContent = activeContent.trim().length > 0;

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus textarea when sidebar opens
  useEffect(() => {
    if (visible) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [visible]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');

    const context = hasContent
      ? `Arquivo: ${activeFileName || 'sem nome'}\n\n${activeContent.slice(0, 3000)}`
      : undefined;
    sendMessage(text, context);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handlePreset(preset: typeof PRESETS[number]) {
    if (!hasContent) return;
    const prompt = preset.prompt(activeContent.slice(0, 3000));
    sendMessage(prompt);
  }

  const baseName = activeFileName
    ? activeFileName.replace(/\.md$/, '')
    : 'claude-response';

  return (
    <div className={`${styles.chatSidebar} ${!visible ? styles.collapsed : ''}`}>
      {/* Header */}
      <div className={styles.chatHeader}>
        <div className={styles.chatHeaderTitle}>
          <ClaudeIconSvg size={16} className={styles.chatHeaderIcon} />
          <span>Claude Chat</span>
        </div>
        <div className={styles.chatHeaderActions}>
          {messages.length > 0 && (
            <button className={styles.iconBtn} onClick={clearHistory} title="Limpar histórico">
              <Icon icon="codicon:trash" width={14} />
            </button>
          )}
          <button className={styles.iconBtn} onClick={onClose} title="Fechar (Ctrl+Shift+C)">
            <Icon icon="codicon:close" width={14} />
          </button>
        </div>
      </div>

      {/* File context indicator */}
      {activeFileName && (
        <div className={styles.fileContext}>
          <Icon icon="vscode-icons:file-type-markdown" width={13} />
          <span className={styles.fileContextName}>{activeFileName}</span>
          <span className={styles.fileContextWords}>
            {activeContent ? `${activeContent.trim().split(/\s+/).length} palavras` : 'vazio'}
          </span>
        </div>
      )}

      {/* Preset buttons */}
      <div className={styles.presetBar}>
        {PRESETS.map(preset => (
          <button
            key={preset.id}
            className={styles.presetBtn}
            onClick={() => handlePreset(preset)}
            disabled={!hasContent || isLoading}
            title={hasContent ? `${preset.label} (usa conteúdo do arquivo)` : 'Abra um arquivo para usar esta ação'}
          >
            <Icon icon={preset.icon} width={12} />
            <span>{preset.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.divider} />

      {/* Messages */}
      <div className={styles.messagesArea}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrap}>
              <ClaudeIconSvg size={28} />
            </div>
            <p className={styles.emptyTitle}>Como posso ajudar?</p>
            <p className={styles.emptyDesc}>
              Faça perguntas sobre o conteúdo, peça para reescrever, gerar tarefas ou brainstorm de ideias.
            </p>
            {hasContent ? (
              <div className={styles.suggestionList}>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s.text}
                    className={styles.suggestionBtn}
                    onClick={() => {
                      const context = `Arquivo: ${activeFileName || 'sem nome'}\n\n${activeContent.slice(0, 3000)}`;
                      sendMessage(s.text, context);
                    }}
                    disabled={isLoading}
                  >
                    <Icon icon={s.icon} width={12} />
                    {s.text}
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.emptyHint}>
                <Icon icon="codicon:info" width={12} />
                <span>Abra um arquivo para usar os atalhos de ação acima</span>
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map(message => (
              <MessageBubble
                key={message.id}
                message={message}
                onInsert={onInsertToEditor}
                onSaveAsNew={onSaveAsNewFile}
                suggestedName={`${baseName}-claude.md`}
              />
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'assistant' &&
              messages[messages.length - 1]?.content === '' && (
              <div className={styles.thinkingRow}>
                <div className={styles.thinkingDot} />
                <span>Claude está pensando…</span>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className={styles.inputArea}>
        <div className={styles.inputWrapper}>
          <textarea
            ref={textareaRef}
            className={styles.chatInput}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? 'Aguardando resposta…' : 'Mensagem para o Claude…'}
            rows={1}
            disabled={isLoading}
          />
        </div>
        <div className={styles.inputFooter}>
          <span className={styles.inputHint}>
            <kbd>Enter</kbd> enviar &nbsp;·&nbsp; <kbd>Shift+Enter</kbd> nova linha
          </span>
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            {isLoading
              ? <Icon icon="codicon:loading" width={14} className={styles.spinIcon} />
              : <Icon icon="codicon:send" width={14} />
            }
            {isLoading ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}
