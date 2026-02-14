import type { ClaudeAssistAction } from '../types';
import { isElectron } from './fileSystem';

interface ClaudeElectronAPI {
  claudeAssist: (action: ClaudeAssistAction, content: string, fileName: string) => Promise<string>;
}

function getClaudeElectronAPI(): ClaudeElectronAPI | null {
  const api = (window as unknown as Record<string, unknown>).electronAPI;
  if (!api) return null;
  return api as unknown as ClaudeElectronAPI;
}

const SYSTEM_PROMPTS: Record<ClaudeAssistAction, string> = {
  rewriter: `You are a professional technical writer. Rewrite the provided markdown content into a polished, professional, and detailed version. Maintain the same core information but improve:
- Clarity and readability
- Professional tone
- Structure and organization
- Grammar and style
Return ONLY the improved markdown, no explanations.`,

  diagram: `You are a diagram generation expert. Analyze the provided markdown content and generate a Mermaid diagram that visually represents the key concepts, relationships, or flow described in the text. Return ONLY the mermaid code block in markdown format (\`\`\`mermaid ... \`\`\`), no explanations.`,

  brainstorm: `You are a creative brainstorming assistant. Based on the provided markdown content, generate 5 or more creative and unique approaches, ideas, or alternative perspectives. Format each idea as a markdown section with a title and brief description. Return ONLY the markdown content, no meta-commentary.`,

  tasks: `You are a project management assistant. Convert the provided markdown content into a structured, actionable task breakdown. Format as a markdown checklist with:
- Main tasks as top-level items with checkboxes
- Sub-tasks as nested items with checkboxes
- Clear, actionable descriptions
- Priority hints where applicable (🔴 high, 🟡 medium, 🟢 low)
Return ONLY the markdown task list, no explanations.`,
};

const ACTION_LABELS: Record<ClaudeAssistAction, string> = {
  rewriter: 'Professional Rewriter',
  diagram: 'Diagram Generator',
  brainstorm: 'Creative Brainstorming',
  tasks: 'Task Breakdown',
};

export async function callClaudeAssist(
  action: ClaudeAssistAction,
  content: string,
  fileName: string,
): Promise<string> {
  if (!content.trim()) {
    throw new Error('No content to process. Please open a file with content first.');
  }

  if (isElectron()) {
    const api = getClaudeElectronAPI();
    if (api) {
      return api.claudeAssist(action, content, fileName);
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
