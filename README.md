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

### 1. Pull the image

```bash
docker pull <DOCKERHUB_USER>/markdown-editor:latest
```

### 2. Set up the `md` command

Download the CLI script and place it in your PATH:

```bash
sudo curl -fsSL https://raw.githubusercontent.com/<GITHUB_USER>/markdown-editor/main/scripts/md \
  -o /usr/local/bin/md
sudo chmod +x /usr/local/bin/md
```

Or manually: copy the `scripts/md` file from this repo to anywhere in your `$PATH`.

### 3. Use it

```bash
# Open the current directory
md .

# Open a specific directory
md ~/Documents/notes
```

The script automatically pulls the image on first run if it's not present locally.

### Requirements

- **Docker** installed and running
- **Linux**: X11 display server (default on most distros)
- **macOS**: [XQuartz](https://www.xquartz.org/) with "Allow connections from network clients" enabled

### Updating

```bash
docker rmi <DOCKERHUB_USER>/markdown-editor:latest
docker pull <DOCKERHUB_USER>/markdown-editor:latest
```

Or pin a specific version: `docker pull <DOCKERHUB_USER>/markdown-editor:1.0.0`

## Credits

This project is based on **[FrankMD](https://github.com/akitaonrails/FrankMD)** by **[Fabio Akita](https://github.com/akitaonrails)**. Full credit goes to him for the original concept and implementation. This version is a personal reimagining tailored to my own workflow and preferences.
