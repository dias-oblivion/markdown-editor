import type { FileEntry } from '../types';

// ── Electron detection ──

interface ElectronAPI {
  openDirectory: () => Promise<string | null>;
  readDirectory: (dirPath: string) => Promise<FileEntry>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  createFile: (dirPath: string, name: string) => Promise<string>;
  renameFile: (oldPath: string, newName: string) => Promise<string>;
  deleteFile: (filePath: string) => Promise<void>;
  createDirectory: (parentPath: string, name: string) => Promise<string>;
  renameDirectory: (oldPath: string, newName: string) => Promise<string>;
  deleteDirectory: (dirPath: string) => Promise<void>;
  getInitialWorkspace: () => Promise<string | null>;
}

function getElectronAPI(): ElectronAPI | null {
  const api = (window as unknown as Record<string, unknown>).electronAPI;
  return api ? (api as ElectronAPI) : null;
}

export function isElectron(): boolean {
  return getElectronAPI() !== null;
}

// ── Initial workspace (CLI / Docker) ──

export async function getInitialWorkspace(): Promise<string | null> {
  const api = getElectronAPI();
  if (!api) return null;
  return api.getInitialWorkspace();
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

/** Create a new file in either Electron or Browser mode, then return a fresh FileEntry for it. */
export async function createNewFile(
  dirEntry: FileEntry,
  fileName: string,
): Promise<{ filePath: string; handle?: FileSystemFileHandle }> {
  const api = getElectronAPI();
  if (api) {
    const filePath = await api.createFile(dirEntry.path, fileName);
    return { filePath };
  }
  if (dirEntry.handle) {
    const fileHandle = await (dirEntry.handle as FileSystemDirectoryHandle).getFileHandle(fileName, { create: true });
    return { filePath: `${dirEntry.path}/${fileName}`, handle: fileHandle };
  }
  throw new Error('Cannot create file: no handle or Electron API');
}

/** Rename a file. Returns the new path. */
export async function renameFile(
  entry: FileEntry,
  newName: string,
  parentDirEntry?: FileEntry,
): Promise<string> {
  const api = getElectronAPI();
  if (api) {
    return api.renameFile(entry.path, newName);
  }
  // Browser: use File System Access API — must re-create file with new name and delete old
  if (parentDirEntry?.handle && entry.handle) {
    const dirHandle = parentDirEntry.handle as FileSystemDirectoryHandle;
    const oldFileHandle = entry.handle as FileSystemFileHandle;
    const file = await oldFileHandle.getFile();
    const content = await file.text();
    const newFileHandle = await dirHandle.getFileHandle(newName, { create: true });
    const writable = await newFileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    await dirHandle.removeEntry(entry.name);
    const parentPath = parentDirEntry.path;
    return `${parentPath}/${newName}`;
  }
  throw new Error('Cannot rename file: no handle or Electron API');
}

/** Delete a file. */
export async function deleteFile(
  entry: FileEntry,
  parentDirEntry?: FileEntry,
): Promise<void> {
  const api = getElectronAPI();
  if (api) {
    await api.deleteFile(entry.path);
    return;
  }
  // Browser: use File System Access API
  if (parentDirEntry?.handle) {
    const dirHandle = parentDirEntry.handle as FileSystemDirectoryHandle;
    await dirHandle.removeEntry(entry.name);
    return;
  }
  throw new Error('Cannot delete file: no handle or Electron API');
}

/** Create a new directory. */
export async function createNewDirectory(
  dirEntry: FileEntry,
  folderName: string,
): Promise<{ dirPath: string; handle?: FileSystemDirectoryHandle }> {
  const api = getElectronAPI();
  if (api) {
    const dirPath = await api.createDirectory(dirEntry.path, folderName);
    return { dirPath };
  }
  if (dirEntry.handle) {
    const parentHandle = dirEntry.handle as FileSystemDirectoryHandle;
    const newDirHandle = await parentHandle.getDirectoryHandle(folderName, { create: true });
    return { dirPath: `${dirEntry.path}/${folderName}`, handle: newDirHandle };
  }
  throw new Error('Cannot create directory: no handle or Electron API');
}

/** Rename a directory. Returns the new path. */
export async function renameDirectory(
  entry: FileEntry,
  newName: string,
  parentDirEntry?: FileEntry,
): Promise<string> {
  const api = getElectronAPI();
  if (api) {
    return api.renameDirectory(entry.path, newName);
  }
  // Browser: File System Access API does not support renaming directories directly.
  // We would need to recursively copy and delete, which is complex.
  // For now, throw if no Electron API.
  if (parentDirEntry?.handle) {
    throw new Error('Renaming directories is not supported in browser mode');
  }
  throw new Error('Cannot rename directory: no handle or Electron API');
}

/** Delete a directory recursively. */
export async function deleteDirectory(
  entry: FileEntry,
  parentDirEntry?: FileEntry,
): Promise<void> {
  const api = getElectronAPI();
  if (api) {
    await api.deleteDirectory(entry.path);
    return;
  }
  // Browser: use File System Access API
  if (parentDirEntry?.handle) {
    const dirHandle = parentDirEntry.handle as FileSystemDirectoryHandle;
    await dirHandle.removeEntry(entry.name, { recursive: true });
    return;
  }
  throw new Error('Cannot delete directory: no handle or Electron API');
}

/** Re-read the full directory tree from root. */
export async function refreshDirectoryTree(rootEntry: FileEntry): Promise<FileEntry | null> {
  const api = getElectronAPI();
  if (api) {
    return reopenDirectoryByPath(rootEntry.path);
  }
  if (rootEntry.handle) {
    return reopenDirectory(rootEntry.handle as FileSystemDirectoryHandle);
  }
  return null;
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
