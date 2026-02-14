# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A markdown editor desktop app (Electron) that also runs in the browser. Built with React + TypeScript + Vite, using CodeMirror 6 for editing and unified/remark/rehype for markdown rendering. Based on [FrankMD](https://github.com/akitaonrails/FrankMD).

## Commands

- `npm run dev` — Start Vite dev server + Electron concurrently (browser at localhost:5173)
- `npm run build` — Full production build (TypeScript + Vite + Electron TS compilation)
- `npm run electron:build` — Build + package Electron app via electron-builder
- `npm run lint` — ESLint (flat config, TS/TSX files only)
- `npm run preview` — Preview production Vite build

There are no tests configured in this project.

## Architecture

### Dual Runtime: Electron + Browser

The app runs in two modes with a unified abstraction layer:

- **Electron**: File I/O via IPC (`electron/main.ts` handles `fs:*` channels, `electron/preload.ts` exposes `window.electronAPI`). Supports `--workspace=<path>` CLI arg for Docker/direct launch.
- **Browser**: Uses the File System Access API (`window.showDirectoryPicker`). No server needed.

`src/utils/fileSystem.ts` is the abstraction layer — every file operation checks `isElectron()` and branches accordingly. This is the central place to add new file system operations.

### State Management

No external state library. All state lives in React hooks:

- **`useFileSystem`** — Core hook managing: root directory entry, open tabs, active tab, session persistence (via `sessionStorage`). On mount it restores workspace from CLI args (Electron) or session storage.
- **`useKeyboardShortcuts`** — Global keyboard shortcuts (Ctrl+S save, Ctrl+P command palette, Ctrl+F find, Ctrl+N new file).
- **`useMarkdown`** — Markdown-to-HTML pipeline using unified/remark-parse/remark-gfm/remark-rehype/rehype-prism-plus/rehype-stringify.

### Component Structure

`App.tsx` is the root, composing:
- **Sidebar** — Directory tree (`FileTree`) + new file dialog
- **Toolbar** — View mode toggle, theme switch, tab bar, insert actions (table/code block dialogs)
- **Editor** — CodeMirror 6 instance + `MarkdownPreview` (split/editor-only/preview-only via `ViewMode`)
- **CommandPalette** — Fuzzy file search overlay (Ctrl+P)
- **ContextMenu** — Right-click formatting (bold, italic, highlight, etc.)

### Styling

CSS Modules (`*.module.css`) per component + global CSS variables in `src/styles/theme.css` for dark/light theming. Theme is toggled via `data-theme` attribute on `<html>`.

### Electron Build

- `electron/main.ts` — Main process (window creation, IPC handlers, recursive directory reading)
- `electron/preload.ts` — Context bridge exposing `electronAPI`
- Separate tsconfigs: `tsconfig.electron.json` and `tsconfig.electron.preload.json`
- `electron-builder.yml` for packaging config
- Docker support via `Dockerfile` + `docker-compose.yml` (X11 forwarding)

### Key Types (`src/types/index.ts`)

- `FileEntry` — Tree node with optional `handle` (browser) or `path` (Electron)
- `EditorTab` — Open file tab with content, dirty state, and file handle/path
- `ViewMode` — `'editor' | 'preview'`
- `FormatAction` — Text formatting actions for context menu
