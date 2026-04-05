import type { AISettings, AIProvider } from '../types';

const AI_SETTINGS_KEY = 'markdown-editor-ai-settings';

const DEFAULT_SETTINGS: AISettings = {
  provider: 'claude',
  terminalVisible: false,
};

export function saveAISettings(settings: AISettings): void {
  try {
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
    // If in Electron, also notify main process
    if (window.electronAPI) {
      window.electronAPI.updateAISettings?.(settings);
    }
  } catch {
    // Storage full or unavailable
  }
}

const VALID_PROVIDERS: AIProvider[] = ['claude', 'copilot', 'opencode'];

export function getAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(AI_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate legacy 'openai' provider to 'opencode'
      if (parsed.provider === 'openai') parsed.provider = 'opencode';
      // Fallback to default if provider is unknown
      if (!VALID_PROVIDERS.includes(parsed.provider)) parsed.provider = DEFAULT_SETTINGS.provider;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // Parse error or unavailable
  }
  return DEFAULT_SETTINGS;
}

export function updateAIProvider(provider: AIProvider): void {
  const settings = getAISettings();
  saveAISettings({ ...settings, provider });
}

export function updateTerminalVisibility(visible: boolean): void {
  const settings = getAISettings();
  saveAISettings({ ...settings, terminalVisible: visible });
}
