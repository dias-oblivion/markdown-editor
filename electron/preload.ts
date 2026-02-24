import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  readDirectory: (path: string) => ipcRenderer.invoke('fs:readDirectory', path),
  readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:writeFile', path, content),
  createFile: (dirPath: string, name: string) => ipcRenderer.invoke('fs:createFile', dirPath, name),
  renameFile: (oldPath: string, newName: string) => ipcRenderer.invoke('fs:renameFile', oldPath, newName),
  deleteFile: (filePath: string) => ipcRenderer.invoke('fs:deleteFile', filePath),
  createDirectory: (parentPath: string, name: string) => ipcRenderer.invoke('fs:createDirectory', parentPath, name),
  renameDirectory: (oldPath: string, newName: string) => ipcRenderer.invoke('fs:renameDirectory', oldPath, newName),
  deleteDirectory: (dirPath: string) => ipcRenderer.invoke('fs:deleteDirectory', dirPath),
  getInitialWorkspace: () => ipcRenderer.invoke('app:getInitialWorkspace'),
  claudeAssist: (action: string, content: string, fileName: string, useTerminal: boolean) =>
    ipcRenderer.invoke('claude:assist', action, content, fileName, useTerminal),
});
