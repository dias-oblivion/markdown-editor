import { useState, useCallback, useRef } from 'react';
import type { ChatMessage } from '../types';
import { isElectron } from '../utils/fileSystem';

interface UseClaudeChatOptions {
  workspacePath?: string;
}

interface UseClaudeChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (text: string, systemContext?: string) => Promise<void>;
  clearHistory: () => void;
}

const DEFAULT_SYSTEM =
  'Você é um assistente de escrita markdown, especialista em documentação técnica, formatação e estruturação de conteúdo. Responda de forma clara e concisa, em português.';

interface ElectronChatAPI {
  sendChatMessage: (prompt: string, workspaceDir?: string) => void;
  onChatToken: (cb: (token: string) => void) => void;
  onChatDone: (cb: (result: { success: boolean }) => void) => void;
  removeChatListeners: () => void;
}

function getElectronChatAPI(): ElectronChatAPI | null {
  const api = (window as unknown as Record<string, unknown>).electronAPI;
  return api ? (api as ElectronChatAPI) : null;
}

export function useClaudeChat({ workspacePath }: UseClaudeChatOptions = {}): UseClaudeChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const clearHistory = useCallback(() => {
    setMessages([]);
  }, []);

  const sendMessage = useCallback(async (text: string, systemContext?: string) => {
    if (!text.trim() || isLoading) return;

    const currentMessages = messagesRef.current;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const assistantId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);

    try {
      if (isElectron()) {
        await sendViaElectron(currentMessages, text, systemContext, assistantId, workspacePath);
      } else {
        await sendViaBrowser(currentMessages, text, systemContext, assistantId);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Erro ao enviar mensagem';
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId ? { ...m, content: `❌ ${errMsg}` } : m
        )
      );
    } finally {
      setIsLoading(false);
    }

    function updateAssistant(token: string) {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId ? { ...m, content: m.content + token } : m
        )
      );
    }

    async function sendViaElectron(
      history: ChatMessage[],
      userText: string,
      sysContext: string | undefined,
      _assistantId: string,
      wsPath?: string,
    ) {
      const api = getElectronChatAPI();
      if (!api) throw new Error('electronAPI não disponível');

      const systemPart = sysContext
        ? `${DEFAULT_SYSTEM}\n\nContexto do arquivo:\n${sysContext}`
        : DEFAULT_SYSTEM;

      const historyText = history
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

      const prompt = historyText
        ? `${systemPart}\n\nConversa anterior:\n${historyText}\n\nUser: ${userText}\n\nAssistant:`
        : `${systemPart}\n\nUser: ${userText}\n\nAssistant:`;

      api.removeChatListeners();

      return new Promise<void>((resolve, reject) => {
        api.onChatToken((token: string) => {
          updateAssistant(token);
        });

        api.onChatDone((result: { success: boolean }) => {
          api.removeChatListeners();
          if (result.success) {
            resolve();
          } else {
            reject(new Error('Claude CLI finalizou com erro'));
          }
        });

        api.sendChatMessage(prompt, wsPath);
      });
    }

    async function sendViaBrowser(
      history: ChatMessage[],
      userText: string,
      sysContext: string | undefined,
      _assistantId: string,
    ) {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey || apiKey === 'your-api-key-here') {
        throw new Error(
          'Anthropic API key não configurada. Configure VITE_ANTHROPIC_API_KEY no arquivo .env'
        );
      }

      const systemPart = sysContext
        ? `${DEFAULT_SYSTEM}\n\nContexto do arquivo:\n${sysContext}`
        : DEFAULT_SYSTEM;

      const apiMessages = [
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: userText },
      ];

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
          system: systemPart,
          stream: true,
          messages: apiMessages,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          `Claude API error (${response.status}): ${JSON.stringify((error as Record<string, unknown>)?.error ?? error)}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') return;

          try {
            const event = JSON.parse(data);
            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              updateAssistant(event.delta.text);
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    }
  }, [isLoading, workspacePath]);

  return { messages, isLoading, sendMessage, clearHistory };
}
