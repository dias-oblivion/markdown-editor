import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse --workspace=<path> from CLI arguments
function getWorkspaceArg(): string | null {
  const prefix = '--workspace=';
  const arg = process.argv.find(a => a.startsWith(prefix));
  return arg ? arg.substring(prefix.length) : null;
}

const initialWorkspace = getWorkspaceArg();

// Docker mode: disable GPU and sandbox (no hardware acceleration in containers)
if (process.env.ELECTRON_IN_DOCKER === '1') {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-software-rasterizer');
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Markdown Editor',
    icon: path.join(__dirname, '../assets/icon.png'),
    backgroundColor: '#111111',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers

ipcMain.handle('app:getInitialWorkspace', () => {
  return initialWorkspace;
});

ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('fs:readDirectory', async (_event, dirPath: string) => {
  return readDirectoryRecursive(dirPath);
});

ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
  return fs.promises.readFile(filePath, 'utf-8');
});

ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
  await fs.promises.writeFile(filePath, content, 'utf-8');
});

ipcMain.handle('fs:createFile', async (_event, dirPath: string, name: string) => {
  const filePath = path.join(dirPath, name);
  await fs.promises.writeFile(filePath, '', 'utf-8');
  return filePath;
});

interface FsEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FsEntry[];
}

async function readDirectoryRecursive(dirPath: string): Promise<FsEntry> {
  const name = path.basename(dirPath);
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  const children: FsEntry[] = [];

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.name.startsWith('.')) continue; // skip hidden files

    if (entry.isDirectory()) {
      const child = await readDirectoryRecursive(entryPath);
      children.push(child);
    } else {
      children.push({
        name: entry.name,
        path: entryPath,
        isDirectory: false,
      });
    }
  }

  children.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  return {
    name,
    path: dirPath,
    isDirectory: true,
    children,
  };
}
