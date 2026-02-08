import type { FileEntry } from '../types';

// ── Electron detection ──

interface ElectronAPI {
  openDirectory: () => Promise<string | null>;
  readDirectory: (dirPath: string) => Promise<FileEntry>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  createFile: (dirPath: string, name: string) => Promise<string>;
}

function getElectronAPI(): ElectronAPI | null {
  const api = (window as unknown as Record<string, unknown>).electronAPI;
  return api ? (api as ElectronAPI) : null;
}

export function isElectron(): boolean {
  return getElectronAPI() !== null;
}

// ── Open directory ──

export async function openDirectory(): Promise<FileEntry | null> {
  const api = getElectronAPI();
  if (api) {
    const dirPath = await api.openDirectory();
    if (!dirPath) return null;
    return api.readDirectory(dirPath);
  }

  try {
    const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    return await readDirectoryBrowser(dirHandle, '');
  } catch {
    return null;
  }
}

export async function reopenDirectoryByPath(dirPath: string): Promise<FileEntry | null> {
  const api = getElectronAPI();
  if (!api) return null;
  try {
    return await api.readDirectory(dirPath);
  } catch {
    return null;
  }
}

export async function reopenDirectory(handle: FileSystemDirectoryHandle): Promise<FileEntry | null> {
  try {
    return await readDirectoryBrowser(handle, '');
  } catch {
    return null;
  }
}

// ── Read / Write files ──

export async function readFileContent(entry: FileEntry): Promise<string> {
  const api = getElectronAPI();
  if (api) {
    return api.readFile(entry.path);
  }
  if (entry.handle) {
    const file = await (entry.handle as FileSystemFileHandle).getFile();
    return file.text();
  }
  throw new Error('Cannot read file');
}

export async function readFileByPath(filePath: string): Promise<string> {
  const api = getElectronAPI();
  if (!api) throw new Error('readFileByPath requires Electron');
  return api.readFile(filePath);
}

export async function writeFileContent(tab: { path: string; handle?: FileSystemFileHandle; content: string }): Promise<void> {
  const api = getElectronAPI();
  if (api) {
    await api.writeFile(tab.path, tab.content);
    return;
  }
  if (tab.handle) {
    const writable = await tab.handle.createWritable();
    await writable.write(tab.content);
    await writable.close();
    return;
  }
  throw new Error('Cannot write file');
}

// Legacy exports for any remaining browser-only callers
export async function readFile(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

export async function writeFile(handle: FileSystemFileHandle, content: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

// ── Browser File System Access API (internal) ──

async function readDirectoryBrowser(
  handle: FileSystemDirectoryHandle,
  parentPath: string
): Promise<FileEntry> {
  const path = parentPath ? `${parentPath}/${handle.name}` : handle.name;
  const children: FileEntry[] = [];

  for await (const [name, childHandle] of handle.entries()) {
    if (childHandle.kind === 'directory') {
      const child = await readDirectoryBrowser(childHandle as FileSystemDirectoryHandle, path);
      children.push(child);
    } else {
      children.push({
        name,
        path: `${path}/${name}`,
        isDirectory: false,
        handle: childHandle as FileSystemFileHandle,
      });
    }
  }

  children.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  return {
    name: handle.name,
    path,
    isDirectory: true,
    children,
    handle,
  };
}

// ── Utilities ──

export async function createFile(
  dirHandle: FileSystemDirectoryHandle,
  name: string
): Promise<FileSystemFileHandle> {
  return dirHandle.getFileHandle(name, { create: true });
}

export function flattenFiles(entry: FileEntry): FileEntry[] {
  const result: FileEntry[] = [];

  function walk(node: FileEntry) {
    if (!node.isDirectory) {
      result.push(node);
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  walk(entry);
  return result;
}

export function findFileByPath(root: FileEntry, targetPath: string): FileEntry | null {
  if (!root.isDirectory && root.path === targetPath) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findFileByPath(child, targetPath);
      if (found) return found;
    }
  }
  return null;
}

export function isMarkdownFile(name: string): boolean {
  return /\.(md|mdx|markdown|txt)$/i.test(name);
}
