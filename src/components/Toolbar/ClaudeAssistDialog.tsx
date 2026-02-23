import { useState } from 'react';
import { Icon } from '@iconify/react';
import type { ClaudeAssistAction } from '../../types';
import { callClaudeAssist, getActionLabel } from '../../utils/claude';
import { isElectron } from '../../utils/fileSystem';
import styles from './Toolbar.module.css';

const CLAUDE_ACTIONS: { id: ClaudeAssistAction; icon: string; title: string; description: string }[] = [
  {
    id: 'rewriter',
    icon: 'codicon:edit',
    title: 'Reescritor Profissional',
    description: 'Transforma o arquivo atual em uma versão profissional e detalhada',
  },
  {
    id: 'diagram',
    icon: 'codicon:type-hierarchy-sub',
    title: 'Gerador de Diagramas',
    description: 'Gera fluxogramas e diagramas a partir do seu markdown',
  },
  {
    id: 'brainstorm',
    icon: 'codicon:lightbulb',
    title: 'Brainstorming Criativo',
    description: 'Gera 5+ abordagens criativas e ideias para seu conteúdo',
  },
  {
    id: 'tasks',
    icon: 'codicon:checklist',
    title: 'Divisão de Tarefas',
    description: 'Converte o markdown em tarefas estruturadas e acionáveis',
  },
];

const TERMINAL_MODE_KEY = 'claude-assist-terminal-mode';

function loadTerminalMode(): boolean {
  try {
    return localStorage.getItem(TERMINAL_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

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
  const [terminalMode, setTerminalMode] = useState(loadTerminalMode);
  const inElectron = isElectron();

  function toggleTerminalMode() {
    const next = !terminalMode;
    setTerminalMode(next);
    try {
      localStorage.setItem(TERMINAL_MODE_KEY, String(next));
    } catch { /* ignore */ }
  }

  async function handleAction(action: ClaudeAssistAction) {
    setLoading(true);
    setActiveAction(action);
    setError(null);
    setResult(null);

    try {
      const response = await callClaudeAssist(action, content, fileName, terminalMode);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado');
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

  // Result / Error view
  if (result !== null || error) {
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
          ) : inElectron ? (
            <div className={styles.claudeSuccess}>
              <Icon icon="codicon:check" width={16} />
              <span>Arquivo criado com sucesso na pasta do workspace.</span>
            </div>
          ) : (
            <div className={styles.claudeResultPreview}>
              <pre className={styles.claudeResultCode}>{result}</pre>
            </div>
          )}

          <div className={styles.dialogActions}>
            <button className={`${styles.dialogButton} ${styles.dialogButtonCancel}`} onClick={handleBack}>
              Voltar
            </button>
            {result && !inElectron && (
              <button className={`${styles.dialogButton} ${styles.dialogButtonPrimary}`} onClick={handleInsert}>
                Inserir Resultado
              </button>
            )}
            {(error || inElectron) && (
              <button className={`${styles.dialogButton} ${styles.dialogButtonPrimary}`} onClick={onCancel}>
                Fechar
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
            <span>
              {terminalMode && inElectron
                ? 'Aguardando o terminal…'
                : `Executando ${activeAction ? getActionLabel(activeAction) : ''}…`}
            </span>
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
          Ferramentas com IA para aprimorar seu markdown
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
            <span>Abra um arquivo com conteúdo para usar o Claude Assist</span>
          </div>
        )}

        <div className={styles.dialogActions}>
          {inElectron && (
            <label className={styles.claudeTerminalToggle}>
              <input
                type="checkbox"
                checked={terminalMode}
                onChange={toggleTerminalMode}
              />
              <Icon icon="codicon:terminal" width={13} />
              <span>Abrir terminal</span>
            </label>
          )}
          <button className={`${styles.dialogButton} ${styles.dialogButtonCancel}`} onClick={onCancel}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
