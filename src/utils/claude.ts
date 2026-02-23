import type { ClaudeAssistAction } from '../types';
import { isElectron } from './fileSystem';

interface ClaudeElectronAPI {
  claudeAssist: (action: ClaudeAssistAction, content: string, fileName: string, useTerminal: boolean) => Promise<string>;
}

function getClaudeElectronAPI(): ClaudeElectronAPI | null {
  const api = (window as unknown as Record<string, unknown>).electronAPI;
  if (!api) return null;
  return api as unknown as ClaudeElectronAPI;
}

const SYSTEM_PROMPTS: Record<ClaudeAssistAction, string> = {
  rewriter: `Você é um escritor técnico profissional. Reescreva o conteúdo markdown fornecido em uma versão polida, profissional e detalhada. Mantenha as mesmas informações centrais, mas melhore clareza, legibilidade, tom profissional, estrutura e gramática. Retorne APENAS o markdown melhorado, sem explicações. Responda em português.`,

  diagram: `Você é um especialista em geração de diagramas. Analise o conteúdo markdown fornecido e gere um diagrama Mermaid que represente visualmente os conceitos-chave, relacionamentos ou fluxo descritos. Retorne APENAS o seguinte formato exato, sem nenhum texto antes ou depois:\n\`\`\`mermaid\n[código do diagrama aqui]\n\`\`\`\nResponda em português.`,

  brainstorm: `Você é um assistente criativo de brainstorming. Com base no conteúdo markdown fornecido, gere 5 ou mais abordagens criativas e únicas, ideias ou perspectivas alternativas. Formate cada ideia como uma seção markdown com título e breve descrição. Retorne APENAS o conteúdo markdown, sem comentários adicionais. Responda em português.`,

  tasks: `Você é um assistente de gerenciamento de projetos. Converta o conteúdo markdown fornecido em uma lista de tarefas estruturada e acionável. Formate como checklist markdown com tarefas principais com checkboxes e subtarefas aninhadas com checkboxes. Retorne APENAS a lista de tarefas em markdown, sem explicações. Responda em português.`,
};

const ACTION_LABELS: Record<ClaudeAssistAction, string> = {
  rewriter: 'Reescritor Profissional',
  diagram: 'Gerador de Diagramas',
  brainstorm: 'Brainstorming Criativo',
  tasks: 'Divisão de Tarefas',
};

export async function callClaudeAssist(
  action: ClaudeAssistAction,
  content: string,
  fileName: string,
  useTerminal = false,
): Promise<string> {
  if (!content.trim()) {
    throw new Error('No content to process. Please open a file with content first.');
  }

  if (isElectron()) {
    const api = getClaudeElectronAPI();
    if (api) {
      return api.claudeAssist(action, content, fileName, useTerminal);
    }
  }

  // Browser mode: use Vite proxy
  return callClaudeAPI(action, content);
}

async function callClaudeAPI(
  action: ClaudeAssistAction,
  content: string,
): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your-api-key-here') {
    throw new Error(
      'Anthropic API key not configured. Please set VITE_ANTHROPIC_API_KEY in your .env file.'
    );
  }

  const response = await fetch('/api/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPTS[action],
      messages: [
        {
          role: 'user',
          content: `Here is the markdown content from the file:\n\n${content}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Claude API error (${response.status}): ${(error as Record<string, unknown>)?.error?.toString() || response.statusText}`
    );
  }

  const data = await response.json();
  const textBlock = data.content?.find((block: Record<string, string>) => block.type === 'text');
  if (!textBlock?.text) {
    throw new Error('No response from Claude');
  }

  return textBlock.text;
}

export function getActionLabel(action: ClaudeAssistAction): string {
  return ACTION_LABELS[action];
}
