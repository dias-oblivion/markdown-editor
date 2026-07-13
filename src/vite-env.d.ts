/// <reference types="vite/client" />

interface FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
}

interface ElectronAPI {
  openDirectory: () => Promise<string | null>;
  readDirectory: (path: string) => Promise<any>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  createFile: (dirPath: string, name: string) => Promise<string>;
  renameFile: (oldPath: string, newName: string) => Promise<string>;
  deleteFile: (filePath: string) => Promise<void>;
  createDirectory: (parentPath: string, name: string) => Promise<string>;
  renameDirectory: (oldPath: string, newName: string) => Promise<string>;
  deleteDirectory: (dirPath: string) => Promise<void>;
  getInitialWorkspace: () => Promise<string | null>;
  moveFile: (oldPath: string, targetDirPath: string) => Promise<string>;
  claudeAssist: (action: string, content: string, fileName: string, useTerminal: boolean) => Promise<string>;
  sendChatMessage: (prompt: string, workspaceDir?: string) => void;
  onChatToken: (callback: (token: string) => void) => void;
  onChatDone: (callback: (result: { success: boolean }) => void) => void;
  removeChatListeners: () => void;
  updateAISettings?: (settings: { provider: string; terminalVisible: boolean }) => void;
  onOpenPlan?: (callback: (filePath: string) => void) => void;
  removeOpenPlanListeners?: () => void;
}

interface Window {
  showDirectoryPicker(options?: { mode?: string }): Promise<FileSystemDirectoryHandle>;
  electronAPI?: ElectronAPI;
}
