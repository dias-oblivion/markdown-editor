<p align="center">
  <img src="assets/icon.png" alt="Markdown Editor" width="128" />
</p>

<h1 align="center">Markdown Editor</h1>

<p align="center">
  A personal markdown editor built for daily use — fast, minimal, and customizable.
</p>

---

## About

This is a markdown editor desktop application that I'm building and personalizing to fit my daily workflow. It runs as an Electron app (and also in the browser) with a dark-first design, live preview, and a file explorer sidebar.

The project is entirely based on and inspired by **[FrankMD](https://github.com/akitaonrails/FrankMD)**, created by **[Akita](https://github.com/akitaonrails)**. All credit for the original idea, design direction, and architecture goes to him. I'm reimagining the application according to my own needs.

## Features

- CodeMirror 6 editor with markdown syntax highlighting
- Live markdown preview (split view, editor-only, or preview-only)
- File explorer sidebar with directory tree
- Tabs for multiple open files
- Command palette for quick file navigation
- Context menu with formatting options (bold, italic, highlight, strikethrough, etc.)
- Dark and light theme toggle
- Session persistence — remembers your open directory and tabs across restarts
- Find and replace
- Runs as a desktop app (Electron) or in the browser

## Stack

- **React 18** + **TypeScript** + **Vite**
- **CodeMirror 6** — editor
- **unified / remark / rehype** — markdown processing pipeline
- **Electron** — desktop shell
- **CSS Modules** + **CSS Variables** — styling with theme support

## Getting Started

```bash
# Install dependencies
npm install

# Development (browser)
npm run dev

# Development (Electron)
npm run electron:dev

# Production build
npm run build

# Package Electron app
npm run electron:build
```

## Docker

```bash
docker build -t markdown-editor .
docker run -p 3000:80 markdown-editor
```

## Credits

This project is based on **[FrankMD](https://github.com/akitaonrails/FrankMD)** by **[Fabio Akita](https://github.com/akitaonrails)**. Full credit goes to him for the original concept and implementation. This version is a personal reimagining tailored to my own workflow and preferences.
