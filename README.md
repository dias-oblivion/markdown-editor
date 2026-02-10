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

## Install via Docker

The fastest way to use the editor — no need to clone the repo.

### Quick Start

```bash
# Download and run the installer
bash <(curl -sL https://raw.githubusercontent.com/dias-oblivion/markdown-editor/main/scripts/install.sh)
```

Then add the following line to your `~/.bashrc` or `~/.zshrc`:

```bash
source ~/.config/markdown-editor/md.sh
```

Reload your shell and you're ready to go:

```bash
md ~/my-notes
```

### Usage

```bash
# Open the current directory
md .

# Open a specific directory
md ~/Documents/notes

# Update the Docker image
md-update

# Stop a running container
md-stop
```

The `md` command automatically pulls the image on first run if it's not present locally.

### Requirements

- **Docker** installed and running
- **Linux**: X11 display server (default on most distros)
- **macOS**: [XQuartz](https://www.xquartz.org/) with "Allow connections from network clients" enabled

### Updating

```bash
md-update
```

Or pin a specific version: `docker pull obliviondias/markdown-editor:1.0.0`

## Roadmap

Future features and improvements planned for the editor:

### Claude Assist Integration

- **Professional Rewriter** — Transform current file into a more professional and detailed version  
  Output: `filename-claude-detailed.md`

- **Diagram Generator** — Generate flowcharts and diagrams from markdown content  
  Output: `filename-diagram.png`

- **Creative Brainstorming** — Get 5+ different creative approaches based on the current content  
  Output: `filename-claude-free-ideas.md`

- **Task Breakdown** — Convert markdown content into structured Trello-style tasks with titles and descriptions

### Grammar & Spell Check

- **AI-Powered Corrections** — Orthographic correction using Claude integration
- **Diff View** — Side-by-side comparison showing original vs corrected text (Git-style)
- **Smart Suggestions** — Context-aware grammar and style improvements

### Additional Ideas

- **Export Templates** — Convert markdown to PDF, HTML, or slide presentations
- **Collaborative Comments** — Add inline comments and suggestions for team workflows  
- **Plugin System** — Custom extensions for specialized markdown features
- **Git Integration** — Track changes, commit directly from editor, and sync with repositories
- **AI Summarizer** — Generate executive summaries or abstracts from long documents
- **Content Analytics** — Word count, reading time, complexity metrics per section
- **Link Checker** — Validate all external and internal links in documents

> **Note:** This roadmap represents ideas and potential features. Implementation priority will depend on user feedback and development capacity.

## Credits

This project is based on **[FrankMD](https://github.com/akitaonrails/FrankMD)** by **[Fabio Akita](https://github.com/akitaonrails)**. Full credit goes to him for the original concept and implementation. This version is a personal reimagining tailored to my own workflow and preferences.
