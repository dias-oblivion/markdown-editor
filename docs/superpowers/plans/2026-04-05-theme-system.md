# Theme System Expansion + Settings Dialog — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand from 2 to 10 independent themes (5 dark + 5 light) and replace the floating submenu SettingsPanel with a proper centered settings dialog.

**Architecture:** Each theme is fully independent — a single `activeTheme: ThemeId` state replaces the old `theme` + `colorTheme` dual state. CSS variables are defined in individual `[data-theme="..."]` blocks. A new `SettingsDialog` modal replaces `SettingsPanel`, with tabs for Appearance (theme grid), AI Provider, and Editor.

**Tech Stack:** React 18, TypeScript, CSS Modules, CodeMirror 6 (`@codemirror/language`, `@lezer/highlight`), Vite

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `src/types/index.ts` | Remove `ColorTheme`, `Theme`; add `ThemeId`, `ThemeMeta` |
| Modify | `src/styles/theme.css` | Replace 4 combined selectors with 10 individual `[data-theme]` blocks |
| Create | `src/components/SettingsDialog/SettingsDialog.tsx` | New modal component (tabs: Appearance, AI Provider, Editor) |
| Create | `src/components/SettingsDialog/SettingsDialog.module.css` | Modal styles |
| Modify | `src/components/App.tsx` | Unify theme state; swap SettingsMenu → SettingsDialog; remove Toolbar theme props |
| Modify | `src/components/Toolbar/Toolbar.tsx` | Remove `theme` prop, `onThemeChange` prop, and sun/moon toggle button |
| Modify | `src/components/Editor/Editor.tsx` | Add 6 new `HighlightStyle` configs; update `getHighlightStyle(activeTheme)` |
| Modify | `src/components/Editor/MarkdownPreview.tsx` | Update `getMermaidTheme()` to use light theme ID list |
| Delete | `src/components/SettingsPanel/SettingsPanel.tsx` | Replaced by SettingsDialog |
| Delete | `src/components/SettingsPanel/SettingsPanel.module.css` | Replaced by SettingsDialog |

---

### Task 1: Update types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Replace `ColorTheme` with `ThemeId` and add `ThemeMeta`**

In `src/types/index.ts`, replace line 41 (`export type ColorTheme = 'matte-black' | 'github-dark';`) with:

```ts
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
```

- [ ] **Step 2: Verify TypeScript still compiles**

```bash
cd /home/oblivion/Workspace/React/markdown-editor && npx tsc --noEmit 2>&1 | head -30
```

Expected: errors about `ColorTheme` usage in other files — that's fine, we'll fix them in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add ThemeId union type and THEMES registry, remove ColorTheme"
```

---

### Task 2: Rewrite CSS theme variables

**Files:**
- Modify: `src/styles/theme.css`

- [ ] **Step 1: Replace the entire contents of `src/styles/theme.css`**

```css
/* ─────────────────────────────────────────────────────────
   Theme variables — one [data-theme] block per theme.
   Layout/spacing/font vars stay in :root (not theme-specific).
   ───────────────────────────────────────────────────────── */

:root {
  /* ── Matte Black (default dark theme) ── */
  --bg-primary: #111111;
  --bg-secondary: #141414;
  --bg-tertiary: #1a1a1a;
  --bg-editor: #1e1e1e;
  --bg-elevated: #2a2a2a;
  --bg-hover: #2e2e2e;
  --bg-active: #383838;

  --text-primary: #d4d4d4;
  --text-secondary: #8a8a8a;
  --text-muted: #555555;
  --text-accent: #e8a838;

  --heading-h1: #5c9ce6;
  --heading-h2: #4db8a0;
  --heading-h3: #b07cd8;
  --heading-h4: #8a8a8a;

  --border-color: #2a2a2a;
  --border-subtle: #1e1e1e;

  --accent-primary: #e8a838;
  --accent-hover: #f0b848;
  --accent-muted: rgba(232, 168, 56, 0.12);

  --danger: #e85454;
  --success: #4caf50;
  --info: #5c9ce6;

  --scrollbar-track: #111111;
  --scrollbar-thumb: #333333;
  --scrollbar-thumb-hover: #444444;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.6);

  /* ── Layout (not theme-specific) ── */
  --activitybar-width: 48px;
  --sidebar-width: 250px;
  --toolbar-height: 40px;
  --statusbar-height: 28px;

  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;

  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
}

/* ── GitHub Dark ── */
[data-theme="github-dark"] {
  --bg-primary: #0d1117;
  --bg-secondary: #010409;
  --bg-tertiary: #161b22;
  --bg-editor: #0d1117;
  --bg-elevated: #161b22;
  --bg-hover: #6e76811a;
  --bg-active: #6e768166;

  --text-primary: #e6edf3;
  --text-secondary: #7d8590;
  --text-muted: #6e7681;
  --text-accent: #2f81f7;

  --heading-h1: #79c0ff;
  --heading-h2: #7ee787;
  --heading-h3: #d2a8ff;
  --heading-h4: #7d8590;

  --border-color: #30363d;
  --border-subtle: #21262d;

  --accent-primary: #2f81f7;
  --accent-hover: #58a6ff;
  --accent-muted: #388bfd26;

  --danger: #f85149;
  --success: #3fb950;
  --info: #2f81f7;

  --scrollbar-track: #010409;
  --scrollbar-thumb: #8b949e33;
  --scrollbar-thumb-hover: #8b949e3d;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.6);
}

/* ── Dracula ── */
[data-theme="dracula"] {
  --bg-primary: #282a36;
  --bg-secondary: #21252b;
  --bg-tertiary: #1e1f29;
  --bg-editor: #282a36;
  --bg-elevated: #343746;
  --bg-hover: #44475a;
  --bg-active: #44475a;

  --text-primary: #f8f8f2;
  --text-secondary: #6272a4;
  --text-muted: #44475a;
  --text-accent: #bd93f9;

  --heading-h1: #ff79c6;
  --heading-h2: #8be9fd;
  --heading-h3: #50fa7b;
  --heading-h4: #6272a4;

  --border-color: #343746;
  --border-subtle: #21252b;

  --accent-primary: #bd93f9;
  --accent-hover: #caa9fa;
  --accent-muted: rgba(189, 147, 249, 0.12);

  --danger: #ff5555;
  --success: #50fa7b;
  --info: #8be9fd;

  --scrollbar-track: #1e1f29;
  --scrollbar-thumb: #44475a;
  --scrollbar-thumb-hover: #6272a4;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.6);
}

/* ── Monokai Pro ── */
[data-theme="monokai-pro"] {
  --bg-primary: #2d2a2e;
  --bg-secondary: #221f22;
  --bg-tertiary: #19181a;
  --bg-editor: #2d2a2e;
  --bg-elevated: #403e41;
  --bg-hover: #403e41;
  --bg-active: #5b595c;

  --text-primary: #fcfcfa;
  --text-secondary: #939293;
  --text-muted: #5b595c;
  --text-accent: #ff6188;

  --heading-h1: #ff6188;
  --heading-h2: #ffd866;
  --heading-h3: #a9dc76;
  --heading-h4: #939293;

  --border-color: #403e41;
  --border-subtle: #221f22;

  --accent-primary: #ff6188;
  --accent-hover: #ff79c4;
  --accent-muted: rgba(255, 97, 136, 0.12);

  --danger: #ff6188;
  --success: #a9dc76;
  --info: #78dce8;

  --scrollbar-track: #19181a;
  --scrollbar-thumb: #5b595c;
  --scrollbar-thumb-hover: #939293;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.6);
}

/* ── Ayu Dark ── */
[data-theme="ayu-dark"] {
  --bg-primary: #0d1017;
  --bg-secondary: #0b0e13;
  --bg-tertiary: #090c10;
  --bg-editor: #0d1017;
  --bg-elevated: #1a2233;
  --bg-hover: #1a2233;
  --bg-active: #253347;

  --text-primary: #bfbdb6;
  --text-secondary: #626a73;
  --text-muted: #3d4751;
  --text-accent: #ffb454;

  --heading-h1: #59c2ff;
  --heading-h2: #d2a6ff;
  --heading-h3: #95e6cb;
  --heading-h4: #626a73;

  --border-color: #1a2233;
  --border-subtle: #0b0e13;

  --accent-primary: #ffb454;
  --accent-hover: #ffc26e;
  --accent-muted: rgba(255, 180, 84, 0.12);

  --danger: #f07178;
  --success: #c2d94c;
  --info: #59c2ff;

  --scrollbar-track: #090c10;
  --scrollbar-thumb: #253347;
  --scrollbar-thumb-hover: #3d4751;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.6);
}

/* ── Matte White ── */
[data-theme="matte-white"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #ebebeb;
  --bg-editor: #ffffff;
  --bg-elevated: #e0e0e0;
  --bg-hover: #e8e8e8;
  --bg-active: #d5d5d5;

  --text-primary: #1a1a1a;
  --text-secondary: #555555;
  --text-muted: #999999;
  --text-accent: #c48820;

  --heading-h1: #1a6cb5;
  --heading-h2: #2a8a72;
  --heading-h3: #8840b0;
  --heading-h4: #777777;

  --border-color: #dcdcdc;
  --border-subtle: #e8e8e8;

  --accent-primary: #d49520;
  --accent-hover: #c48820;
  --accent-muted: rgba(212, 149, 32, 0.1);

  --danger: #d32f2f;
  --success: #388e3c;
  --info: #1976d2;

  --scrollbar-track: #f5f5f5;
  --scrollbar-thumb: #c0c0c0;
  --scrollbar-thumb-hover: #a0a0a0;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.12);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.15);
}

/* ── GitHub Light ── */
[data-theme="github-light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f6f8fa;
  --bg-tertiary: #f6f8fa;
  --bg-editor: #ffffff;
  --bg-elevated: #ffffff;
  --bg-hover: #eaeef280;
  --bg-active: #afb8c133;

  --text-primary: #1f2328;
  --text-secondary: #656d76;
  --text-muted: #6e7781;
  --text-accent: #0969da;

  --heading-h1: #0550ae;
  --heading-h2: #116329;
  --heading-h3: #8250df;
  --heading-h4: #656d76;

  --border-color: #d0d7de;
  --border-subtle: #d8dee4;

  --accent-primary: #0969da;
  --accent-hover: #0550ae;
  --accent-muted: #ddf4ff;

  --danger: #cf222e;
  --success: #1a7f37;
  --info: #0969da;

  --scrollbar-track: #f6f8fa;
  --scrollbar-thumb: #8c959f33;
  --scrollbar-thumb-hover: #8c959f3d;

  --shadow-sm: 0 1px 3px rgba(31, 35, 40, 0.08);
  --shadow-md: 0 4px 12px rgba(31, 35, 40, 0.1);
  --shadow-lg: 0 8px 24px rgba(31, 35, 40, 0.12);
}

/* ── Quiet Light ── */
[data-theme="quiet-light"] {
  --bg-primary: #f5f5f0;
  --bg-secondary: #eeeeea;
  --bg-tertiary: #e5e5e0;
  --bg-editor: #f5f5f0;
  --bg-elevated: #e8e8e3;
  --bg-hover: #e0e0db;
  --bg-active: #d5d5d0;

  --text-primary: #333333;
  --text-secondary: #777777;
  --text-muted: #aaaaaa;
  --text-accent: #325cc0;

  --heading-h1: #325cc0;
  --heading-h2: #448c27;
  --heading-h3: #7a3e9d;
  --heading-h4: #777777;

  --border-color: #ddddd8;
  --border-subtle: #e5e5e0;

  --accent-primary: #325cc0;
  --accent-hover: #2a4fa8;
  --accent-muted: rgba(50, 92, 192, 0.12);

  --danger: #aa3731;
  --success: #448c27;
  --info: #325cc0;

  --scrollbar-track: #eeeeea;
  --scrollbar-thumb: #cccccc;
  --scrollbar-thumb-hover: #aaaaaa;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* ── Solarized Light ── */
[data-theme="solarized-light"] {
  --bg-primary: #fdf6e3;
  --bg-secondary: #eee8d5;
  --bg-tertiary: #e7e0c9;
  --bg-editor: #fdf6e3;
  --bg-elevated: #e8e1ca;
  --bg-hover: #ddd6bf;
  --bg-active: #d0c9b2;

  --text-primary: #657b83;
  --text-secondary: #93a1a1;
  --text-muted: #839496;
  --text-accent: #268bd2;

  --heading-h1: #268bd2;
  --heading-h2: #859900;
  --heading-h3: #6c71c4;
  --heading-h4: #93a1a1;

  --border-color: #d3ccb5;
  --border-subtle: #e7e0c9;

  --accent-primary: #268bd2;
  --accent-hover: #1e77b8;
  --accent-muted: rgba(38, 139, 210, 0.12);

  --danger: #dc322f;
  --success: #859900;
  --info: #268bd2;

  --scrollbar-track: #eee8d5;
  --scrollbar-thumb: #c0bba4;
  --scrollbar-thumb-hover: #a8a390;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* ── Gruvbox Light ── */
[data-theme="gruvbox-light"] {
  --bg-primary: #fbf1c7;
  --bg-secondary: #f2e5bc;
  --bg-tertiary: #ebdbb2;
  --bg-editor: #fbf1c7;
  --bg-elevated: #eddbb2;
  --bg-hover: #e5d4a8;
  --bg-active: #d9c9a0;

  --text-primary: #3c3836;
  --text-secondary: #665c54;
  --text-muted: #928374;
  --text-accent: #b57614;

  --heading-h1: #076678;
  --heading-h2: #79740e;
  --heading-h3: #8f3f71;
  --heading-h4: #665c54;

  --border-color: #d5c4a1;
  --border-subtle: #ebdbb2;

  --accent-primary: #b57614;
  --accent-hover: #c98d1a;
  --accent-muted: rgba(181, 118, 20, 0.12);

  --danger: #cc241d;
  --success: #79740e;
  --info: #076678;

  --scrollbar-track: #f2e5bc;
  --scrollbar-thumb: #c0b080;
  --scrollbar-thumb-hover: #a89868;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/theme.css
git commit -m "feat: expand theme.css to 10 independent data-theme blocks"
```

---

### Task 3: Create SettingsDialog component

**Files:**
- Create: `src/components/SettingsDialog/SettingsDialog.tsx`
- Create: `src/components/SettingsDialog/SettingsDialog.module.css`

- [ ] **Step 1: Create CSS module**

Create `src/components/SettingsDialog/SettingsDialog.module.css`:

```css
/* Overlay */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Dialog box */
.dialog {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 560px;
  max-width: calc(100vw - 48px);
  max-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  animation: slideIn 0.15s ease-out;
  overflow: hidden;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 14px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.closeButton {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-fast), color var(--transition-fast);
  flex-shrink: 0;
}

.closeButton:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* Tabs */
.tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border-color);
  padding: 0 20px;
  flex-shrink: 0;
}

.tab {
  padding: 9px 14px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  border: none;
  background: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color var(--transition-fast);
  font-family: var(--font-sans);
}

.tab:hover {
  color: var(--text-primary);
}

.tabActive {
  color: var(--accent-primary);
  border-bottom-color: var(--accent-primary);
  font-weight: 500;
}

/* Body */
.body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

/* Section title */
.sectionTitle {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin: 0 0 12px;
}

/* Theme grid */
.themeGrid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 24px;
}

.themeSwatch {
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  transition: border-color var(--transition-fast), transform var(--transition-fast);
  position: relative;
}

.themeSwatch:hover {
  border-color: var(--text-muted);
  transform: translateY(-1px);
}

.themeSwatchSelected {
  border-color: var(--accent-primary);
}

.themeSwatchSelected:hover {
  border-color: var(--accent-hover);
}

.swatchColors {
  display: flex;
  height: 32px;
}

.swatchColor {
  flex: 1;
}

.swatchLabel {
  padding: 4px 6px;
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.checkBadge {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-primary);
  color: var(--bg-primary);
  font-size: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

/* Setting rows (AI tab) */
.settingRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-subtle);
}

.settingRow:last-child {
  border-bottom: none;
}

.settingLabel {
  font-size: 13px;
  color: var(--text-primary);
}

.settingDesc {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.settingSelect {
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 5px 10px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  min-width: 140px;
  font-family: var(--font-sans);
}

.settingSelect:focus {
  outline: 1px solid var(--accent-primary);
}

/* Toggle */
.toggle {
  width: 34px;
  height: 20px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  position: relative;
  transition: background var(--transition-fast);
  flex-shrink: 0;
}

.toggleOn {
  background: var(--accent-primary);
}

.toggleOff {
  background: var(--bg-elevated);
}

.toggleKnob {
  position: absolute;
  top: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  transition: left var(--transition-fast);
}

.toggleKnobOn  { left: 17px; }
.toggleKnobOff { left: 3px; }

/* Editor tab placeholder */
.placeholder {
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
  padding: 32px 0;
}
```

- [ ] **Step 2: Create component**

Create `src/components/SettingsDialog/SettingsDialog.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import type { ThemeId, AIProvider, AISettings } from '../../types';
import { THEMES } from '../../types';
import styles from './SettingsDialog.module.css';

type Tab = 'appearance' | 'ai' | 'editor';

const AI_PROVIDERS: { id: AIProvider; label: string }[] = [
  { id: 'claude',   label: 'Claude' },
  { id: 'copilot',  label: 'GitHub Copilot' },
  { id: 'opencode', label: 'Opencode' },
];

interface SettingsDialogProps {
  activeTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  aiSettings: AISettings;
  onAISettingsChange: (settings: AISettings) => void;
  onClose: () => void;
}

export function SettingsDialog({
  activeTheme,
  onThemeChange,
  aiSettings,
  onAISettingsChange,
  onClose,
}: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<Tab>('appearance');
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Close when clicking the overlay (but not the dialog)
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={handleOverlayClick}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label="Configurações">

        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Configurações</h2>
          <button className={styles.closeButton} onClick={onClose} title="Fechar (Esc)">
            <Icon icon="codicon:close" width={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {(['appearance', 'ai', 'editor'] as Tab[]).map((tab) => (
            <button
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'appearance' ? 'Aparência' : tab === 'ai' ? 'AI Provider' : 'Editor'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className={styles.body}>

          {/* ── Appearance tab ── */}
          {activeTab === 'appearance' && (
            <>
              <p className={styles.sectionTitle}>Tema</p>
              <div className={styles.themeGrid}>
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    className={`${styles.themeSwatch} ${activeTheme === theme.id ? styles.themeSwatchSelected : ''}`}
                    onClick={() => onThemeChange(theme.id)}
                    title={theme.name}
                  >
                    {activeTheme === theme.id && (
                      <span className={styles.checkBadge}>✓</span>
                    )}
                    <div className={styles.swatchColors}>
                      {theme.swatchColors.map((color, i) => (
                        <div key={i} className={styles.swatchColor} style={{ background: color }} />
                      ))}
                    </div>
                    <div
                      className={styles.swatchLabel}
                      style={{ background: theme.swatchColors[1], color: theme.isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }}
                    >
                      {theme.name}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── AI Provider tab ── */}
          {activeTab === 'ai' && (
            <>
              <p className={styles.sectionTitle}>Provedor de AI</p>
              <div className={styles.settingRow}>
                <div>
                  <div className={styles.settingLabel}>Provider</div>
                  <div className={styles.settingDesc}>Serviço de AI para assistente de escrita</div>
                </div>
                <select
                  className={styles.settingSelect}
                  value={aiSettings.provider}
                  onChange={(e) =>
                    onAISettingsChange({ ...aiSettings, provider: e.target.value as AIProvider })
                  }
                >
                  {AI_PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.settingRow}>
                <div>
                  <div className={styles.settingLabel}>Terminal</div>
                  <div className={styles.settingDesc}>Mostrar terminal integrado do AI</div>
                </div>
                <button
                  className={`${styles.toggle} ${aiSettings.terminalVisible ? styles.toggleOn : styles.toggleOff}`}
                  onClick={() =>
                    onAISettingsChange({ ...aiSettings, terminalVisible: !aiSettings.terminalVisible })
                  }
                  title={aiSettings.terminalVisible ? 'Ocultar terminal' : 'Mostrar terminal'}
                >
                  <span
                    className={`${styles.toggleKnob} ${aiSettings.terminalVisible ? styles.toggleKnobOn : styles.toggleKnobOff}`}
                  />
                </button>
              </div>
            </>
          )}

          {/* ── Editor tab ── */}
          {activeTab === 'editor' && (
            <p className={styles.placeholder}>Configurações do editor em breve.</p>
          )}

        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SettingsDialog/
git commit -m "feat: create SettingsDialog modal with theme grid and AI settings tabs"
```

---

### Task 4: Update App.tsx

**Files:**
- Modify: `src/components/App.tsx`

- [ ] **Step 1: Replace the theme-related imports, state, and effects at the top of App.tsx**

Replace lines 3–33 (the imports, `Theme` type, `getInitialTheme`, `getInitialColorTheme`):

```tsx
import { useState, useRef, useCallback, useEffect } from 'react';
import { Icon } from '@iconify/react';
import type { ViewMode, FormatAction, FileEntry, ThemeId, AISettings } from '../types';

import { useFileSystem } from '../hooks/useFileSystem';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { getAISettings, saveAISettings } from '../utils/aiSettings';
import { ActivityBar } from './ActivityBar/ActivityBar';
import { Sidebar } from './Sidebar/Sidebar';
import { Toolbar } from './Toolbar/Toolbar';
import { Editor } from './Editor/Editor';
import { CommandPalette } from './CommandPalette/CommandPalette';
import { ContextMenu } from './ContextMenu/ContextMenu';
import { SettingsDialog } from './SettingsDialog/SettingsDialog';
import { ClaudeChat } from './ClaudeChat/ClaudeChat';

const VALID_THEMES: ThemeId[] = [
  'matte-black', 'github-dark', 'dracula', 'monokai-pro', 'ayu-dark',
  'matte-white', 'github-light', 'quiet-light', 'solarized-light', 'gruvbox-light',
];

function getInitialTheme(): ThemeId {
  try {
    const saved = localStorage.getItem('markdown-editor-theme') as ThemeId;
    if (VALID_THEMES.includes(saved)) return saved;
  } catch { /* ignore */ }
  return 'matte-black';
}
```

- [ ] **Step 2: Replace theme state and effects inside the `App()` function**

Find and replace the two state declarations and two theme `useEffect`s:

Old code (lines ~95, ~123–146):
```tsx
const [theme, setTheme] = useState<Theme>(getInitialTheme);
// ...
const [colorTheme, setColorTheme] = useState<ColorTheme>(getInitialColorTheme);
// ...
useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('markdown-editor-theme', theme);
}, [theme]);

useEffect(() => {
  if (colorTheme === 'matte-black') {
    document.documentElement.removeAttribute('data-color-theme');
  } else {
    document.documentElement.setAttribute('data-color-theme', colorTheme);
  }
  localStorage.setItem('markdown-editor-color-theme', colorTheme);
}, [colorTheme]);
```

New code:
```tsx
const [activeTheme, setActiveTheme] = useState<ThemeId>(getInitialTheme);

useEffect(() => {
  document.documentElement.setAttribute('data-theme', activeTheme);
  localStorage.setItem('markdown-editor-theme', activeTheme);
}, [activeTheme]);
```

- [ ] **Step 3: Update SettingsMenu → SettingsDialog in the JSX**

Find this block (around line 296):
```tsx
{settingsOpen && (
  <SettingsMenu
    colorTheme={colorTheme}
    onColorThemeChange={setColorTheme}
    aiSettings={aiSettings}
    onAISettingsChange={setAISettings}
    onClose={() => setSettingsOpen(false)}
    anchorLeft={52}
    anchorBottom={12}
  />
)}
```

Replace with:
```tsx
{settingsOpen && (
  <SettingsDialog
    activeTheme={activeTheme}
    onThemeChange={setActiveTheme}
    aiSettings={aiSettings}
    onAISettingsChange={setAISettings}
    onClose={() => setSettingsOpen(false)}
  />
)}
```

- [ ] **Step 4: Remove `theme` and `onThemeChange` from Toolbar and Editor props**

Find the `<Toolbar ...>` JSX block and remove `theme={theme}` and `onThemeChange={setTheme}`:

```tsx
<Toolbar
  viewMode={viewMode}
  onViewModeChange={setViewMode}
  onInsertText={handleInsertText}
  tabs={tabs}
  activeTabId={activeTabId}
  onTabSelect={setActiveTabId}
  onTabClose={closeTab}
  onFind={() => setShowFind(true)}
  chatVisible={chatVisible}
  onToggleChat={toggleChat}
  showCodeDialog={showCodeDialog}
  showTableDialog={showTableDialog}
  aiSettings={aiSettings}
  onShowCodeDialog={setShowCodeDialog}
  onShowTableDialog={setShowTableDialog}
/>
```

Find the `<Editor ...>` JSX block and replace `theme={theme} colorTheme={colorTheme}` with `activeTheme={activeTheme}`:

```tsx
<Editor
  content={currentContent}
  viewMode={viewMode}
  activeTheme={activeTheme}
  onChange={handleContentChange}
  onInsertRef={insertRef}
  showFind={showFind}
  onCloseFind={() => setShowFind(false)}
/>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/App.tsx
git commit -m "feat: unify theme state to activeTheme: ThemeId in App.tsx"
```

---

### Task 5: Update Toolbar — remove theme toggle

**Files:**
- Modify: `src/components/Toolbar/Toolbar.tsx`

- [ ] **Step 1: Remove `theme` and `onThemeChange` from the interface and destructuring**

In `src/components/Toolbar/Toolbar.tsx`, change the interface from:
```tsx
interface ToolbarProps {
  viewMode: ViewMode;
  theme: 'light' | 'dark';
  onViewModeChange: (mode: ViewMode) => void;
  onThemeChange: (theme: 'light' | 'dark') => void;
  // ...rest
}
```

To:
```tsx
interface ToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  // ...rest (no theme, no onThemeChange)
}
```

Remove `theme` and `onThemeChange` from the destructuring in the function signature:
```tsx
export function Toolbar({
  viewMode,
  onViewModeChange,
  onInsertText,
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onFind,
  chatVisible,
  onToggleChat,
  showCodeDialog,
  showTableDialog,
  onShowCodeDialog,
  onShowTableDialog,
  aiSettings,
}: ToolbarProps) {
```

- [ ] **Step 2: Remove the sun/moon toggle button from the JSX**

Find and delete this block (around line 234):
```tsx
{/* Theme toggle */}
<button
  className={styles.themeToggle}
  onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
  title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
>
  <Icon icon={theme === 'dark' ? 'ph:sun-bold' : 'ph:moon-bold'} width={16} />
</button>

<div className={styles.topBarSep} />
```

Also remove the `themeToggle` CSS class from `Toolbar.module.css` if you want to keep the file clean (optional — unused CSS doesn't break anything).

- [ ] **Step 3: Commit**

```bash
git add src/components/Toolbar/Toolbar.tsx
git commit -m "feat: remove light/dark toggle from Toolbar (themes now unified)"
```

---

### Task 6: Update Editor — add 6 new CodeMirror highlight configs

**Files:**
- Modify: `src/components/Editor/Editor.tsx`

- [ ] **Step 1: Replace the import line and add 6 new HighlightStyle definitions**

At the top of `src/components/Editor/Editor.tsx`, change:
```tsx
import type { ViewMode, ColorTheme } from '../../types';
```
To:
```tsx
import type { ViewMode, ThemeId } from '../../types';
```

After the existing `githubLightHighlight` definition (line ~99) and before `getHighlightStyle`, add these 6 new highlight styles:

```tsx
const draculaHighlight = HighlightStyle.define([
  { tag: tags.comment, color: '#6272a4' },
  { tag: tags.keyword, color: '#ff79c6' },
  { tag: tags.string, color: '#f1fa8c' },
  { tag: tags.number, color: '#bd93f9' },
  { tag: tags.bool, color: '#bd93f9' },
  { tag: tags.operator, color: '#ff79c6' },
  { tag: tags.function(tags.variableName), color: '#50fa7b' },
  { tag: tags.definition(tags.variableName), color: '#f8f8f2' },
  { tag: tags.typeName, color: '#8be9fd' },
  { tag: tags.propertyName, color: '#8be9fd' },
  { tag: tags.heading, color: '#ff79c6', fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.link, color: '#8be9fd', textDecoration: 'underline' },
  { tag: tags.url, color: '#8be9fd' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.meta, color: '#bd93f9' },
  { tag: tags.processingInstruction, color: '#ff79c6' },
]);

const monokaiProHighlight = HighlightStyle.define([
  { tag: tags.comment, color: '#939293' },
  { tag: tags.keyword, color: '#ff6188' },
  { tag: tags.string, color: '#ffd866' },
  { tag: tags.number, color: '#ab9df2' },
  { tag: tags.bool, color: '#ab9df2' },
  { tag: tags.operator, color: '#ff6188' },
  { tag: tags.function(tags.variableName), color: '#a9dc76' },
  { tag: tags.definition(tags.variableName), color: '#fcfcfa' },
  { tag: tags.typeName, color: '#78dce8' },
  { tag: tags.propertyName, color: '#78dce8' },
  { tag: tags.heading, color: '#ff6188', fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.link, color: '#78dce8', textDecoration: 'underline' },
  { tag: tags.url, color: '#78dce8' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.meta, color: '#ab9df2' },
  { tag: tags.processingInstruction, color: '#ff6188' },
]);

const ayuDarkHighlight = HighlightStyle.define([
  { tag: tags.comment, color: '#626a73' },
  { tag: tags.keyword, color: '#ff8f40' },
  { tag: tags.string, color: '#aad94c' },
  { tag: tags.number, color: '#d2a6ff' },
  { tag: tags.bool, color: '#d2a6ff' },
  { tag: tags.operator, color: '#f29668' },
  { tag: tags.function(tags.variableName), color: '#ffb454' },
  { tag: tags.definition(tags.variableName), color: '#bfbdb6' },
  { tag: tags.typeName, color: '#59c2ff' },
  { tag: tags.propertyName, color: '#59c2ff' },
  { tag: tags.heading, color: '#59c2ff', fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.link, color: '#59c2ff', textDecoration: 'underline' },
  { tag: tags.url, color: '#59c2ff' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.meta, color: '#d2a6ff' },
  { tag: tags.processingInstruction, color: '#ff8f40' },
]);

const quietLightHighlight = HighlightStyle.define([
  { tag: tags.comment, color: '#aaaaaa' },
  { tag: tags.keyword, color: '#325cc0' },
  { tag: tags.string, color: '#448c27' },
  { tag: tags.number, color: '#aa3731' },
  { tag: tags.bool, color: '#aa3731' },
  { tag: tags.operator, color: '#325cc0' },
  { tag: tags.function(tags.variableName), color: '#7a3e9d' },
  { tag: tags.definition(tags.variableName), color: '#333333' },
  { tag: tags.typeName, color: '#007299' },
  { tag: tags.propertyName, color: '#007299' },
  { tag: tags.heading, color: '#325cc0', fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.link, color: '#325cc0', textDecoration: 'underline' },
  { tag: tags.url, color: '#325cc0' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.meta, color: '#7a3e9d' },
  { tag: tags.processingInstruction, color: '#325cc0' },
]);

const solarizedLightHighlight = HighlightStyle.define([
  { tag: tags.comment, color: '#93a1a1' },
  { tag: tags.keyword, color: '#859900' },
  { tag: tags.string, color: '#2aa198' },
  { tag: tags.number, color: '#d33682' },
  { tag: tags.bool, color: '#d33682' },
  { tag: tags.operator, color: '#657b83' },
  { tag: tags.function(tags.variableName), color: '#268bd2' },
  { tag: tags.definition(tags.variableName), color: '#657b83' },
  { tag: tags.typeName, color: '#6c71c4' },
  { tag: tags.propertyName, color: '#268bd2' },
  { tag: tags.heading, color: '#268bd2', fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.link, color: '#268bd2', textDecoration: 'underline' },
  { tag: tags.url, color: '#268bd2' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.meta, color: '#6c71c4' },
  { tag: tags.processingInstruction, color: '#859900' },
]);

const gruvboxLightHighlight = HighlightStyle.define([
  { tag: tags.comment, color: '#928374' },
  { tag: tags.keyword, color: '#9d0006' },
  { tag: tags.string, color: '#79740e' },
  { tag: tags.number, color: '#8f3f71' },
  { tag: tags.bool, color: '#8f3f71' },
  { tag: tags.operator, color: '#af3a03' },
  { tag: tags.function(tags.variableName), color: '#076678' },
  { tag: tags.definition(tags.variableName), color: '#3c3836' },
  { tag: tags.typeName, color: '#b57614' },
  { tag: tags.propertyName, color: '#076678' },
  { tag: tags.heading, color: '#076678', fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.link, color: '#076678', textDecoration: 'underline' },
  { tag: tags.url, color: '#076678' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.meta, color: '#8f3f71' },
  { tag: tags.processingInstruction, color: '#9d0006' },
]);
```

- [ ] **Step 2: Replace `getHighlightStyle` function**

Replace the current `getHighlightStyle(theme, colorTheme)` function with:

```tsx
function getHighlightStyle(activeTheme: ThemeId): HighlightStyle {
  switch (activeTheme) {
    case 'github-dark':     return githubDarkHighlight;
    case 'dracula':         return draculaHighlight;
    case 'monokai-pro':     return monokaiProHighlight;
    case 'ayu-dark':        return ayuDarkHighlight;
    case 'matte-white':     return lightHighlight;
    case 'github-light':    return githubLightHighlight;
    case 'quiet-light':     return quietLightHighlight;
    case 'solarized-light': return solarizedLightHighlight;
    case 'gruvbox-light':   return gruvboxLightHighlight;
    default:                return darkHighlight; // matte-black
  }
}
```

- [ ] **Step 3: Update EditorProps interface and component signature**

Replace:
```tsx
interface EditorProps {
  content: string;
  viewMode: ViewMode;
  theme: 'light' | 'dark';
  colorTheme: ColorTheme;
  // ...
}

export function Editor({ content, viewMode, theme, colorTheme, ... }: EditorProps) {
```

With:
```tsx
interface EditorProps {
  content: string;
  viewMode: ViewMode;
  activeTheme: ThemeId;
  onChange: (content: string) => void;
  onInsertRef: React.MutableRefObject<((text: string) => void) | null>;
  showFind: boolean;
  onCloseFind: () => void;
}

export function Editor({ content, viewMode, activeTheme, onChange, onInsertRef, showFind, onCloseFind }: EditorProps) {
```

- [ ] **Step 4: Update the two usages of `getHighlightStyle` inside Editor**

Line ~140 (inside the `useEffect` that initializes CodeMirror):
```tsx
const initialStyle = getHighlightStyle(activeTheme);
```

Lines ~212–220 (inside the `useEffect` that swaps highlighting):
```tsx
useEffect(() => {
  const view = viewRef.current;
  if (!view) return;
  const style = getHighlightStyle(activeTheme);
  view.dispatch({
    effects: highlightCompartment.current.reconfigure(syntaxHighlighting(style)),
  });
}, [activeTheme]);
```

- [ ] **Step 5: Commit**

```bash
git add src/components/Editor/Editor.tsx
git commit -m "feat: add 6 new CodeMirror highlight styles and update getHighlightStyle(ThemeId)"
```

---

### Task 7: Update MarkdownPreview — fix getMermaidTheme

**Files:**
- Modify: `src/components/Editor/MarkdownPreview.tsx`

- [ ] **Step 1: Replace `getMermaidTheme`**

Find (line ~75):
```tsx
function getMermaidTheme(): 'dark' | 'default' {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'default' : 'dark';
}
```

Replace with:
```tsx
const LIGHT_THEMES = new Set([
  'matte-white', 'github-light', 'quiet-light', 'solarized-light', 'gruvbox-light',
]);

function getMermaidTheme(): 'dark' | 'default' {
  const t = document.documentElement.getAttribute('data-theme') ?? '';
  return LIGHT_THEMES.has(t) ? 'default' : 'dark';
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Editor/MarkdownPreview.tsx
git commit -m "fix: update getMermaidTheme to use ThemeId light-theme set"
```

---

### Task 8: Delete SettingsPanel

**Files:**
- Delete: `src/components/SettingsPanel/SettingsPanel.tsx`
- Delete: `src/components/SettingsPanel/SettingsPanel.module.css`

- [ ] **Step 1: Delete the files**

```bash
rm src/components/SettingsPanel/SettingsPanel.tsx
rm src/components/SettingsPanel/SettingsPanel.module.css
rmdir src/components/SettingsPanel
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: delete SettingsPanel (replaced by SettingsDialog)"
```

---

### Task 9: Verify build

- [ ] **Step 1: Run TypeScript check**

```bash
cd /home/oblivion/Workspace/React/markdown-editor && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 2: Run dev build**

```bash
npm run dev &
sleep 5
```

Open http://localhost:5173 and verify:
- App loads with Matte Black theme by default
- Gear icon in ActivityBar opens the Settings dialog (centered, with overlay)
- Clicking a theme swatch changes the app theme immediately
- Closing with Esc or ✕ works
- Light themes (matte-white, github-light, etc.) show a light background
- Dark themes show a dark background
- Reload page — theme persists

- [ ] **Step 3: Run production build**

```bash
npm run build 2>&1
```

Expected: `✓ built in X.XXs` with no TypeScript or import errors.

- [ ] **Step 4: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: post-build cleanup"
```
