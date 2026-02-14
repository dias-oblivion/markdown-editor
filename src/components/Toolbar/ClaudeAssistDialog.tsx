import { useState } from 'react';
import { Icon } from '@iconify/react';
import type { ClaudeAssistAction } from '../../types';
import { callClaudeAssist, getActionLabel } from '../../utils/claude';
import styles from './Toolbar.module.css';

const CLAUDE_ACTIONS: { id: ClaudeAssistAction; icon: string; title: string; description: string }[] = [
  {
    id: 'rewriter',
    icon: 'codicon:edit',
    title: 'Professional Rewriter',
    description: 'Transform current file into a professional, detailed version',
  },
  {
    id: 'diagram',
    icon: 'codicon:type-hierarchy-sub',
    title: 'Diagram Generator',
    description: 'Generate flowcharts and diagrams from your markdown',
  },
  {
    id: 'brainstorm',
    icon: 'codicon:lightbulb',
    title: 'Creative Brainstorming',
    description: 'Get 5+ creative approaches and ideas for your content',
  },
  {
    id: 'tasks',
    icon: 'codicon:checklist',
    title: 'Task Breakdown',
    description: 'Convert markdown into structured, actionable tasks',
  },
];

interface ClaudeAssistDialogProps {
  content: string;
  fileName: string;
  onInsertResult: (text: string) => void;
  onCancel: () => void;
}

export function ClaudeAssistDialog({ content, fileName, onInsertResult, onCancel }: ClaudeAssistDialogProps) {
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<ClaudeAssistAction | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: ClaudeAssistAction) {
    setLoading(true);
    setActiveAction(action);
    setError(null);
    setResult(null);

    try {
      const response = await callClaudeAssist(action, content, fileName);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  function handleInsert() {
    if (result) {
      onInsertResult(result);
      onCancel();
    }
  }

  function handleBack() {
    setResult(null);
    setError(null);
    setActiveAction(null);
  }

  // Result view
  if (result || error) {
    return (
      <div className={styles.overlay} onClick={onCancel}>
        <div className={`${styles.dialog} ${styles.claudeDialog} ${styles.claudeResultDialog}`} onClick={e => e.stopPropagation()}>
          <div className={styles.claudeDialogHeader}>
            <Icon icon="simple-icons:anthropic" width={20} className={styles.claudeHeaderIcon} />
            <span className={styles.dialogTitle} style={{ marginBottom: 0 }}>
              {activeAction ? getActionLabel(activeAction) : 'Claude Assist'}
            </span>
          </div>

          {error ? (
            <div className={styles.claudeError}>
              <Icon icon="codicon:error" width={16} />
              <span>{error}</span>
            </div>
          ) : (
            <div className={styles.claudeResultPreview}>
              <pre className={styles.claudeResultCode}>{result}</pre>
            </div>
          )}

          <div className={styles.dialogActions}>
            <button className={`${styles.dialogButton} ${styles.dialogButtonCancel}`} onClick={handleBack}>
              Back
            </button>
            {result && (
              <button className={`${styles.dialogButton} ${styles.dialogButtonPrimary}`} onClick={handleInsert}>
                Insert Result
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Loading view
  if (loading) {
    return (
      <div className={styles.overlay}>
        <div className={`${styles.dialog} ${styles.claudeDialog}`} onClick={e => e.stopPropagation()}>
          <div className={styles.claudeDialogHeader}>
            <Icon icon="simple-icons:anthropic" width={20} className={styles.claudeHeaderIcon} />
            <span className={styles.dialogTitle} style={{ marginBottom: 0 }}>Claude Assist</span>
          </div>
          <div className={styles.claudeLoading}>
            <div className={styles.claudeSpinner} />
            <span>Running {activeAction ? getActionLabel(activeAction) : ''}...</span>
          </div>
        </div>
      </div>
    );
  }

  // Action selection view
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={`${styles.dialog} ${styles.claudeDialog}`} onClick={e => e.stopPropagation()}>
        <div className={styles.claudeDialogHeader}>
          <Icon icon="simple-icons:anthropic" width={20} className={styles.claudeHeaderIcon} />
          <span className={styles.dialogTitle} style={{ marginBottom: 0 }}>Claude Assist</span>
        </div>
        <p className={styles.claudeDialogSubtitle}>
          AI-powered tools to enhance your markdown
        </p>

        <div className={styles.claudeActionGrid}>
          {CLAUDE_ACTIONS.map(action => (
            <button
              key={action.id}
              className={styles.claudeActionCard}
              onClick={() => handleAction(action.id)}
              disabled={!content.trim()}
            >
              <div className={styles.claudeActionIcon}>
                <Icon icon={action.icon} width={20} />
              </div>
              <div className={styles.claudeActionContent}>
                <div className={styles.claudeActionTitle}>{action.title}</div>
                <div className={styles.claudeActionDesc}>{action.description}</div>
              </div>
            </button>
          ))}
        </div>

        {!content.trim() && (
          <div className={styles.claudeWarning}>
            <Icon icon="codicon:warning" width={14} />
            <span>Open a file with content to use Claude Assist</span>
          </div>
        )}

        <div className={styles.dialogActions}>
          <button className={`${styles.dialogButton} ${styles.dialogButtonCancel}`} onClick={onCancel}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
