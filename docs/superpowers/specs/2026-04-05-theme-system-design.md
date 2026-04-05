# Theme System Expansion + Settings Dialog

**Date:** 2026-04-05  
**Status:** Approved

## Context

The app currently has only 2 color themes (Matte Black dark/light and GitHub dark/light), controlled by two separate states: a `theme` toggle (light/dark) in the Toolbar and a `colorTheme` selector in a submenu-style SettingsPanel. The settings UI is a floating submenu anchored to the bottom-left gear icon — hard to navigate and visually poor.

The goal is to expand to 10 independent themes (5 dark + 5 light), unify theme selection into a single control, and replace the submenu with a proper settings dialog.

## Decision: Unified Theme Model (Option B)

Each theme is fully independent. The light/dark toggle is removed. The user picks one theme from a grid of 10 swatches. This eliminates the conceptual friction of "color theme + brightness mode" and maps cleanly to how VS Code and IntelliJ handle themes.

## Themes

| ID | Name | Type |
|----|------|------|
| `matte-black` | Matte Black | dark (existing) |
| `github-dark` | GitHub Dark | dark (existing) |
| `dracula` | Dracula | dark (new) |
| `monokai-pro` | Monokai Pro | dark (new) |
| `ayu-dark` | Ayu Dark | dark (new) |
| `matte-white` | Matte White | light (renamed from current light) |
| `github-light` | GitHub Light | light (existing, split out) |
| `quiet-light` | Quiet Light | light (new) |
| `solarized-light` | Solarized Light | light (new) |
| `gruvbox-light` | Gruvbox Light | light (new) |

## Architecture

### 1. Types (`src/types/index.ts`)

Remove `ColorTheme`. Add `ThemeId`:

```ts
export type ThemeId =
  | 'matte-black' | 'github-dark' | 'dracula' | 'monokai-pro' | 'ayu-dark'
  | 'matte-white' | 'github-light' | 'quiet-light' | 'solarized-light' | 'gruvbox-light';
```

Add a theme metadata registry for the UI:

```ts
export interface ThemeMeta {
  id: ThemeId;
  name: string;
  swatchColors: [string, string, string, string]; // bg1, bg2, accent1, accent2
  isDark: boolean;
}
```

### 2. State (`src/components/App.tsx`)

Remove `theme: 'light' | 'dark'` and `colorTheme: ColorTheme` states. Replace with a single `activeTheme: ThemeId`.

- Initial value: read from `localStorage('markdown-editor-theme')`, fallback to `'matte-black'`
- `useEffect`: `document.documentElement.setAttribute('data-theme', activeTheme)` + persist to localStorage
- Remove `theme` and `colorTheme` props from Toolbar and SettingsDialog; pass only `activeTheme` + `onThemeChange`
- The `onThemeChange` prop currently on Toolbar is removed entirely (no more toggle button)

### 3. CSS (`src/styles/theme.css`)

The existing `:root` block stays as `matte-black` default. The `[data-theme="light"]` and `[data-color-theme="github-dark"]` combined selectors are **removed**. Each theme gets its own block:

```css
:root { /* matte-black */ }
[data-theme="github-dark"] { ... }
[data-theme="dracula"] {
  --bg-primary: #282a36; --bg-secondary: #21252b; --bg-tertiary: #1e1f29;
  --bg-editor: #282a36; --bg-elevated: #343746; --bg-hover: #44475a; --bg-active: #44475a;
  --text-primary: #f8f8f2; --text-secondary: #6272a4; --text-muted: #44475a;
  --text-accent: #bd93f9;
  --heading-h1: #ff79c6; --heading-h2: #8be9fd; --heading-h3: #50fa7b; --heading-h4: #6272a4;
  --border-color: #343746; --border-subtle: #21252b;
  --accent-primary: #bd93f9; --accent-hover: #caa9fa; --accent-muted: rgba(189,147,249,0.12);
  --scrollbar-thumb: #44475a; --scrollbar-thumb-hover: #6272a4;
}
[data-theme="monokai-pro"] { ... }
[data-theme="ayu-dark"] { ... }
[data-theme="matte-white"] { ... }  /* current light vars */
[data-theme="github-light"] { ... }
[data-theme="quiet-light"] { ... }
[data-theme="solarized-light"] { ... }
[data-theme="gruvbox-light"] { ... }
```

All other CSS variables (`--font-mono`, `--radius-*`, `--transition-*`, layout sizes) remain in `:root` unchanged — they are not theme-specific.

### 4. CodeMirror (`src/components/Editor/Editor.tsx`)

`getHighlightStyle(theme, colorTheme)` → `getHighlightStyle(activeTheme: ThemeId)`.

Add 6 new `HighlightStyle` configs (dracula, monokai-pro, ayu-dark, quiet-light, solarized-light, gruvbox-light). The existing 4 (darkHighlight → matte-black, lightHighlight → matte-white, githubDarkHighlight, githubLightHighlight) are kept and renamed for clarity.

The `useEffect` that reconfigures the Compartment now depends only on `activeTheme`.

### 5. Settings Dialog (`src/components/SettingsDialog/`)

New files:
- `SettingsDialog.tsx`
- `SettingsDialog.module.css`

**Props:**
```ts
interface SettingsDialogProps {
  activeTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  aiSettings: AISettings;
  onAISettingsChange: (settings: AISettings) => void;
  onClose: () => void;
}
```

**Structure:**
- `<dialog>` HTML element (native accessibility, native Esc support)
- Dark overlay backdrop
- Header: "Configurações" title + ✕ close button
- 3 tabs: Aparência / AI Provider / Editor
- **Aparência tab:** 5×2 grid of theme swatches. Each swatch shows 4 color blocks + theme name. Selected state: golden border + checkmark badge.
- **AI Provider tab:** migrates current provider select + terminal toggle from SettingsPanel
- **Editor tab:** empty placeholder

`App.tsx` replaces `<SettingsMenu ... anchorLeft={52} anchorBottom={12}>` with `<SettingsDialog ... />`. Removes `anchorLeft` and `anchorBottom` logic.

### 6. Toolbar (`src/components/Toolbar/Toolbar.tsx`)

Remove the sun/moon toggle button and the `onThemeChange` prop. No other changes to Toolbar.

### 7. Mermaid (`src/components/Editor/MarkdownPreview.tsx`)

`getMermaidTheme()` currently reads `data-theme === 'light'`. Update to check if the active theme is one of the light themes:

```ts
const LIGHT_THEMES: ThemeId[] = ['matte-white', 'github-light', 'quiet-light', 'solarized-light', 'gruvbox-light'];
function getMermaidTheme() {
  const t = document.documentElement.getAttribute('data-theme') as ThemeId;
  return LIGHT_THEMES.includes(t) ? 'default' : 'dark';
}
```

### 8. Cleanup

- Delete `src/components/SettingsPanel/SettingsPanel.tsx` and `SettingsPanel.module.css`
- Remove `ColorTheme` type from `src/types/index.ts`
- Remove `Theme` type (`'light' | 'dark'`) from `src/types/index.ts`
- Remove `getInitialTheme()` and related `useEffect` from `App.tsx`
- Remove `colorTheme` state and `getInitialColorTheme()` from `App.tsx`
- Update localStorage key from `'markdown-editor-color-theme'` + `'markdown-editor-theme'` to single `'markdown-editor-theme'`

## Files Modified

| File | Change |
|------|--------|
| `src/types/index.ts` | Remove `ColorTheme`, `Theme`; add `ThemeId`, `ThemeMeta` |
| `src/styles/theme.css` | Replace 4 selectors with 10 individual `[data-theme="..."]` blocks |
| `src/components/App.tsx` | Unify state; swap SettingsMenu → SettingsDialog |
| `src/components/Toolbar/Toolbar.tsx` | Remove sun/moon toggle + `onThemeChange` prop |
| `src/components/Editor/Editor.tsx` | Update `getHighlightStyle`; add 6 new highlight configs |
| `src/components/Editor/MarkdownPreview.tsx` | Update `getMermaidTheme()` to use ThemeId list |
| `src/components/SettingsPanel/*` | **Delete** |
| `src/components/SettingsDialog/*` | **Create** (new component) |

## Verification

1. `npm run dev` — app loads with Matte Black (default)
2. Gear icon → dialog opens centered, overlay escurece o fundo, Esc fecha
3. Aba Aparência: clicar em cada um dos 10 temas muda o app inteiro imediatamente (CSS vars + editor syntax)
4. Temas claros (matte-white, github-light, etc.) exibem o app em fundo branco; escuros em fundo preto
5. Diagrama Mermaid em preview reflete corretamente o tema (claro vs escuro)
6. Aba AI Provider: seleção de provider e toggle de terminal funcionam
7. Fechar dialog e recarregar página: tema persiste via localStorage
8. `npm run build` sem erros de TypeScript
