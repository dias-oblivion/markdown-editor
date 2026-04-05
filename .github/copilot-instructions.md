# Copilot Instructions for Markdown Editor

A minimal markdown editor (Electron + browser) with dual runtime abstraction for AI-guided development.

## Quick Architecture

- **Dual Runtime**: Checks `isElectron()` in [src/utils/fileSystem.ts](src/utils/fileSystem.ts). Electron uses IPC (`window.electronAPI`); browser uses File System Access API or mock data.
- **No State Library**: All state in React hooks. Central hook is `useFileSystem` ([src/hooks/useFileSystem.ts](src/hooks/useFileSystem.ts)) managing tabs, root entry, active file.
- **Rendering Pipeline**: CodeMirror 6 (editor) + unified/remark/rehype (markdown preview via `useMarkdown` in [src/hooks/useMarkdown.ts](src/hooks/useMarkdown.ts)).
- **Styling**: CSS Modules per component + global CSS variables in [src/styles/theme.css](src/styles/theme.css) for dark/light theming with vibrant color hierarchy.

## Essential Patterns to Follow

### 1. File Operations Always Go Through Abstraction Layer
Every file I/O must use [src/utils/fileSystem.ts](src/utils/fileSystem.ts). Pattern: check mock → Electron → browser:
```typescript
export async function readFileContent(entry: FileEntry): Promise<string> {
  if (mockFileContents[entry.path]) return mockFileContents[entry.path]; // Mock check FIRST
  const api = getElectronAPI();
  if (api) return api.readFile(entry.path);                              // Electron second
  if (entry.handle) return (entry.handle as FileSystemFileHandle).getFile().then(f => f.text()); // Browser fallback
  throw new Error('Cannot read file');
}
```
Add console.log at key decision points for debugging dual-runtime issues.

### 2. Mock Data System for Iterative UI Testing
1. Set `USE_MOCK_DATA = true` in [src/components/App.tsx](src/components/App.tsx) line ~56
2. Define `MOCK_FILE_CONTENTS: Record<string, string>` with file paths as keys
3. Call `setMockFileContents(MOCK_FILE_CONTENTS)` in a `useEffect` on App mount
4. Mock system bypasses file picker entirely—enables rapid iteration without Electron/browser dialogs

### 3. Theme System: Vibrant CSS Variables
Dark theme (`:root`) and light theme (`[data-theme="light"]`) defined in [src/styles/theme.css](src/styles/theme.css):
- **H1**: Cyan `#4fd9ff` (dark) / Blue `#0560d9` (light)
- **H2**: Teal `#6ef3b8` (both)
- **H3**: Magenta `#ff7eff` (dark) / Purple `#9c3dd8` (light)
- Toggle via: `document.documentElement.setAttribute('data-theme', theme)`

### 4. Keyboard Shortcuts via Hook
Pass handlers to `useKeyboardShortcuts` in [src/components/App.tsx](src/components/App.tsx). Hook signature:
```typescript
useKeyboardShortcuts({
  onSave, onFind, onCommandPalette, onNewFile, onTogglePreview, onToggleSidebar
})
```
Never use direct `window.addEventListener`—use the hook for consistency.

### 5. Session Persistence
[src/utils/sessionStorage.ts](src/utils/sessionStorage.ts) handles restore logic:
1. **Priority**: CLI args (Electron `--workspace=<path>`) → session storage → empty state
2. `useFileSystem` restore runs on mount; cancellation flag prevents stale state
3. Session auto-saves on tab changes via `saveSession()` call

## Build & Development

- `npm run dev` — Vite + Electron concurrently (browser localhost:5173, port may vary)
- `npm run build` — Full TypeScript + Vite + Electron output to `electron-dist/`
- `npm run electron:build` — Package via electron-builder (output in `dist/`)
- **Debugging**: Use `console.log` in fileSystem.ts utilities; browser DevTools or Electron DevTools via F12

## File Structure Notes

- **[electron/](electron/)** — Main process with IPC handlers. Separate TypeScript configs: `tsconfig.electron.json`, `tsconfig.electron.preload.json`.
- **[src/](src/)** — React app. Data flow: `useFileSystem` hook → `App.tsx` → Sidebar | Toolbar | Editor.
- **[src/styles/theme.css](src/styles/theme.css)** — Single source of truth for color variables (used in all CSS Modules).

## Discoverable Patterns

| Task | Approach |
|------|----------|
| Add file system operation | Add to `fileSystem.ts` with mock/Electron/browser branches; test with `USE_MOCK_DATA=true` |
| New keyboard shortcut | Add handler param to `useKeyboardShortcuts` hook in `App.tsx` |
| Adjust colors | Edit CSS variables in `theme.css`; test both `:root` (dark) and `[data-theme="light"]` |
| Add side panel dialog | Use `ConfirmDialog` component as template ([src/components/ConfirmDialog](src/components/ConfirmDialog)); manage state in `App.tsx` |
| Debug file loading | Check `[readFileContent]` logs in browser console; enable `setMockFileContents()` to bypass real I/O |

## Types & Interfaces

```typescript
interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
  handle?: FileSystemDirectoryHandle | FileSystemFileHandle; // Browser only
}

interface EditorTab {
  id: string;
  path: string;
  content: string;
  isDirty: boolean;
  handle?: FileSystemFileHandle; // Browser only
}

type ViewMode = 'editor' | 'preview' | 'split';
```

## Key Integration Points

- **Claude AI**: [src/utils/claude.ts](src/utils/claude.ts) with system prompts for rewriter, diagram, brainstorm, tasks.
- **File Monitor**: `useFileSystem.refreshTree()` called on window focus to detect external changes.
- **Markdown Rendering**: `useMarkdown()` hook debounces parser (150ms) and catches errors gracefully.
- **Electron IPC**: Main process ([electron/main.ts](electron/main.ts)) exposes `fs:*` channels; preload ([electron/preload.ts](electron/preload.ts)) bridges to `window.electronAPI`.

