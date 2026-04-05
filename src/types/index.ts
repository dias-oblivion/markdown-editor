export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
  handle?: FileSystemDirectoryHandle | FileSystemFileHandle;
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
  | 'matte-black'
  | 'github-dark'
  | 'dracula'
  | 'monokai-pro'
  | 'ayu-dark'
  | 'matte-white'
  | 'github-light'
  | 'quiet-light'
  | 'solarized-light'
  | 'gruvbox-light';

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  /** [bg1, bg2, accent1, accent2] — used to render swatch previews */
  swatchColors: [string, string, string, string];
  isDark: boolean;
}

export const THEMES: ThemeMeta[] = [
  { id: 'matte-black',     name: 'Matte Black',     swatchColors: ['#111111', '#1e1e1e', '#e8a838', '#5c9ce6'], isDark: true  },
  { id: 'github-dark',     name: 'GitHub Dark',     swatchColors: ['#0d1117', '#161b22', '#2f81f7', '#3fb950'], isDark: true  },
  { id: 'dracula',         name: 'Dracula',         swatchColors: ['#282a36', '#1e1f29', '#bd93f9', '#ff79c6'], isDark: true  },
  { id: 'monokai-pro',     name: 'Monokai Pro',     swatchColors: ['#2d2a2e', '#221f22', '#ff6188', '#ffd866'], isDark: true  },
  { id: 'ayu-dark',        name: 'Ayu Dark',        swatchColors: ['#0d1017', '#090e14', '#ffb454', '#59c2ff'], isDark: true  },
  { id: 'matte-white',     name: 'Matte White',     swatchColors: ['#ffffff', '#f5f5f5', '#d49520', '#5c9ce6'], isDark: false },
  { id: 'github-light',    name: 'GitHub Light',    swatchColors: ['#ffffff', '#f6f8fa', '#0969da', '#1a7f37'], isDark: false },
  { id: 'quiet-light',     name: 'Quiet Light',     swatchColors: ['#f5f5f0', '#e8e8e3', '#325cc0', '#448c27'], isDark: false },
  { id: 'solarized-light', name: 'Solarized Light', swatchColors: ['#fdf6e3', '#eee8d5', '#268bd2', '#859900'], isDark: false },
  { id: 'gruvbox-light',   name: 'Gruvbox Light',   swatchColors: ['#fbf1c7', '#ebdbb2', '#b57614', '#076678'], isDark: false },
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
