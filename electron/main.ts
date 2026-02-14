import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { spawn, spawnSync } from 'child_process';
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

// ── Claude Assist ──

/**
 * Action-specific prompts that tell Claude what to do with the referenced file
 */
const CLAUDE_ACTION_PROMPTS: Record<string, (fileName: string, outputFileName: string) => string> = {
  rewriter: (fileName, outputFileName) =>
    `You are a professional technical writer. Read @${fileName}, rewrite its markdown content into a polished, professional, and detailed version. Maintain the same core information but improve clarity, readability, professional tone, structure, and grammar. Write ONLY the improved markdown to ${outputFileName}.`,
  diagram: (fileName, outputFileName) =>
    `You are a diagram generation expert. Read @${fileName}, analyze its markdown content and generate a Mermaid diagram that visually represents the key concepts, relationships, or flow. Write ONLY the mermaid code block in markdown format to ${outputFileName}.`,
  brainstorm: (fileName, outputFileName) =>
    `You are a creative brainstorming assistant. Read @${fileName}, and based on its markdown content, generate 5 or more creative approaches, ideas, or alternative perspectives. Format each as a markdown section and write the result to ${outputFileName}.`,
  tasks: (fileName, outputFileName) =>
    `You are a project management assistant. Read @${fileName}, convert its markdown content into a structured, actionable task breakdown as a markdown checklist with main tasks and sub-tasks using checkboxes. Write the task list to ${outputFileName}.`,
};

/**
 * Run Claude CLI in background and return the generated file content
 * This approach:
 * 1. Runs `claude` in the workspace directory
 * 2. Uses @file syntax to reference the input file
 * 3. Waits for Claude to create the output file
 * 4. Reads and returns the output file content
 */
async function runClaudeCLI(
  workspaceDir: string,
  fileName: string,
  action: string
): Promise<string> {
  // Generate output file name based on action
  const baseName = path.basename(fileName, '.md');
  const outputFileName = `${baseName}-${action}.md`;
  const outputFilePath = path.join(workspaceDir, outputFileName);

  // Get the prompt for this action
  const promptGenerator = CLAUDE_ACTION_PROMPTS[action];
  if (!promptGenerator) {
    throw new Error(`Unknown action: ${action}`);
  }

  const prompt = promptGenerator(fileName, outputFileName);

  return new Promise((resolve, reject) => {
    // Spawn claude CLI in the workspace directory
    const claude = spawn('claude', [prompt], {
      cwd: workspaceDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let errorBuffer = '';

    // Capture stderr for error messages
    claude.stderr.on('data', (data: Buffer) => {
      errorBuffer += data.toString();
    });

    // Handle process completion
    claude.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`Claude CLI exited with code ${code}: ${errorBuffer}`));
        return;
      }

      // Wait a bit for file to be written
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if output file was created
      try {
        const content = await fs.promises.readFile(outputFilePath, 'utf-8');
        resolve(content);
      } catch (error) {
        reject(new Error(`Output file not created: ${outputFileName}`));
      }
    });

    // Handle process errors
    claude.on('error', (error) => {
      reject(new Error(`Failed to spawn Claude CLI: ${error.message}`));
    });
  });
}

ipcMain.handle('claude:assist', async (_event, action: string, _content: string, filePath: string) => {
  // Get workspace directory and file name
  // filePath can be a full path like /home/user/Markdown/file.md
  const workspaceDir = path.dirname(filePath);
  const fileName = path.basename(filePath);

  try {
    // Run Claude CLI and get the result
    const result = await runClaudeCLI(workspaceDir, fileName, action);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Claude CLI error: ${errorMessage}`);
  }
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
