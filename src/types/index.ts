export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
  handle?: FileSystemDirectoryHandle | FileSystemFileHandle;
  /** Last-modified time in ms (Electron only). Used to sort Claude Plans by recency. */
  mtime?: number;
  /** Creation time in ms (Electron only). Falls back to mtime when unavailable. */
  birthtime?: number;
}

export interface EditorTab {
  id: string;
  name: string;
  path: string;
  content: string;
  handle?: FileSystemFileHandle;
  isDirty: boolean;
}

export type ViewMode = 'editor' | 'preview';

export type FormatAction =
  | 'bold'
  | 'italic'
  | 'highlight'
  | 'strikethrough'
  | 'superscript'
  | 'subscript';

export interface TableConfig {
  rows: number;
  cols: number;
  headers: string[];
  data: string[][];
}

export interface CodeBlockConfig {
  language: string;
  code: string;
  useTabs: boolean;
}

export type ThemeId =
  | 'obsidian'
  | 'graphite'
  | 'midnight'
  | 'forest'
  | 'ember'
  | 'paper'
  | 'mist'
  | 'sepia';

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  /** [bg1, bg2, accent1, accent2] — used to render swatch previews */
  swatchColors: [string, string, string, string];
  isDark: boolean;
}

export const THEMES: ThemeMeta[] = [
  // ── Dark ──
  { id: 'obsidian', name: 'Obsidian', swatchColors: ['#1E1E1E', '#262626', '#7C6CF7', '#DCDDDE'], isDark: true  },
  { id: 'graphite', name: 'Graphite', swatchColors: ['#171717', '#212121', '#7C6CF7', '#E2E2E2'], isDark: true  },
  { id: 'midnight', name: 'Midnight', swatchColors: ['#14161D', '#1A1D26', '#5B8DEF', '#D3D8E3'], isDark: true  },
  { id: 'forest',   name: 'Forest',   swatchColors: ['#16191A', '#1C211F', '#5DB075', '#D6DBD7'], isDark: true  },
  { id: 'ember',    name: 'Ember',    swatchColors: ['#1B1714', '#221D19', '#E0A34A', '#E4DDD3'], isDark: true  },
  // ── Light ──
  { id: 'paper',    name: 'Paper',    swatchColors: ['#FFFFFF', '#F1F1F4', '#6B5FD6', '#1A1A1A'], isDark: false },
  { id: 'mist',     name: 'Mist',     swatchColors: ['#F4F4F6', '#EAEAEE', '#6B5FD6', '#232323'], isDark: false },
  { id: 'sepia',    name: 'Sepia',    swatchColors: ['#F5ECDA', '#ECE1C9', '#A4703A', '#3B3327'], isDark: false },
];

export type ClaudeAssistAction = 'rewriter' | 'diagram' | 'brainstorm' | 'tasks';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
}

export type AIProvider = 'claude' | 'copilot' | 'opencode';

export interface AIProviderConfig {
  name: string;
  cliCommand: string;
  cliArgs?: string[];
}

export interface AISettings {
  provider: AIProvider;
  terminalVisible: boolean;
}

export const AI_PROVIDER_CONFIGS: Record<AIProvider, AIProviderConfig> = {
  claude: {
    name: 'Claude Chat',
    cliCommand: 'claude',
    cliArgs: ['--dangerously-skip-permissions'],
  },
  copilot: {
    name: 'Copilot Chat',
    cliCommand: 'copilot',
    cliArgs: ['-p', '--allow-all-tools'],
  },
  opencode: {
    name: 'Opencode Chat',
    cliCommand: 'opencode',
    cliArgs: ['run'],
  },
};
