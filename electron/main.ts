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

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Markdown Editor',
    icon: path.join(__dirname, '../assets/icon.png'),
    backgroundColor: '#111111',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Dev: show menu bar by default; Prod: start hidden. Toggle with Alt key.
  mainWindow.setMenuBarVisibility(isDev);

  // In development, load from Vite dev server
  if (isDev) {
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

ipcMain.handle('fs:renameFile', async (_event, oldPath: string, newName: string) => {
  const dir = path.dirname(oldPath);
  const newPath = path.join(dir, newName);
  await fs.promises.rename(oldPath, newPath);
  return newPath;
});

ipcMain.handle('fs:deleteFile', async (_event, filePath: string) => {
  await fs.promises.unlink(filePath);
});

// ── Claude Assist ──

/**
 * Action-specific prompts that tell Claude what to do with the referenced file
 */
const CLAUDE_ACTION_PROMPTS: Record<string, (fileName: string, outputFileName: string) => string> = {
  rewriter: (fileName, outputFileName) =>
    `Você é um escritor técnico profissional. Leia @${fileName}, reescreva seu conteúdo markdown em uma versão polida, profissional e detalhada. Mantenha as mesmas informações centrais, mas melhore clareza, legibilidade, tom profissional, estrutura e gramática. Escreva APENAS o markdown melhorado em ${outputFileName}. Responda em português.`,
  diagram: (fileName, outputFileName) =>
    `Você é um especialista em geração de diagramas. Leia @${fileName}, analise seu conteúdo markdown e gere um diagrama Mermaid que represente visualmente os conceitos-chave, relacionamentos ou fluxo descritos. Escreva o resultado em ${outputFileName} usando EXATAMENTE este formato, sem nenhum texto antes ou depois:\n\`\`\`mermaid\n[código do diagrama aqui]\n\`\`\`\nResponda em português.`,
  brainstorm: (fileName, outputFileName) =>
    `Você é um assistente criativo de brainstorming. Leia @${fileName} e, com base em seu conteúdo markdown, gere 5 ou mais abordagens criativas, ideias ou perspectivas alternativas. Formate cada uma como uma seção markdown e escreva o resultado em ${outputFileName}. Responda em português.`,
  tasks: (fileName, outputFileName) =>
    `Você é um assistente de gerenciamento de projetos. Leia @${fileName}, converta seu conteúdo markdown em uma lista de tarefas estruturada e acionável como checklist markdown com tarefas principais e subtarefas usando checkboxes. Escreva a lista de tarefas em ${outputFileName}. Responda em português.`,
};

async function runClaudeCLI(
  workspaceDir: string,
  fileName: string,
  action: string,
  useTerminal: boolean
): Promise<string> {
  const baseName = path.basename(fileName, '.md');
  const outputFileName = `${baseName}-${action}.md`;
  const outputFilePath = path.join(workspaceDir, outputFileName);

  const promptGenerator = CLAUDE_ACTION_PROMPTS[action];
  if (!promptGenerator) {
    throw new Error(`Ação desconhecida: ${action}`);
  }

  const prompt = promptGenerator(fileName, outputFileName);

  if (useTerminal) {
    // Abre um xterm visível com o processo do Claude
    const promptPath = path.join(workspaceDir, `.claude-assist-prompt.txt`);
    const scriptPath = path.join(workspaceDir, `.claude-assist-run.sh`);

    await fs.promises.writeFile(promptPath, prompt, 'utf-8');

    const script = `#!/bin/bash
cd "${workspaceDir}"
echo "=== Claude Assist ==="
echo "Ação:    ${action}"
echo "Entrada: ${fileName}"
echo "Saída:   ${outputFileName}"
echo "====================="
echo ""
echo "--- Prompt ---"
cat "${promptPath}"
echo ""
echo "--- Iniciando Claude CLI ---"
echo ""
PROMPT=$(cat "${promptPath}")
claude --dangerously-skip-permissions "$PROMPT"
EXIT_CODE=$?
echo ""
echo "====================="
echo "Código de saída: $EXIT_CODE"
if [ -f "${outputFilePath}" ]; then
  echo "Sucesso: ${outputFileName} criado."
else
  echo "Erro: arquivo de saída não encontrado."
fi
echo ""
read -p "Pressione Enter para fechar..."
rm -f "${promptPath}" "${scriptPath}"
`;

    await fs.promises.writeFile(scriptPath, script, 'utf-8');
    await fs.promises.chmod(scriptPath, 0o755);

    return new Promise((resolve, reject) => {
      const terminal = spawn('xterm', ['-title', 'Claude Assist', '-e', `bash "${scriptPath}"`], {
        cwd: workspaceDir,
        stdio: 'ignore',
      });

      terminal.on('close', async () => {
        await new Promise(r => setTimeout(r, 500));
        try {
          const content = await fs.promises.readFile(outputFilePath, 'utf-8');
          resolve(content);
        } catch {
          reject(new Error(`Arquivo de saída não criado: ${outputFileName}`));
        }
      });

      terminal.on('error', (error) => {
        reject(new Error(`Falha ao abrir xterm: ${error.message}. Instale com: sudo apt install xterm`));
      });
    });
  }

  // Modo oculto: spawn em background sem janela
  return new Promise((resolve, reject) => {
    const claude = spawn('claude', ['-p', '--dangerously-skip-permissions', prompt], {
      cwd: workspaceDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let errorBuffer = '';

    claude.stderr.on('data', (data: Buffer) => {
      errorBuffer += data.toString();
    });

    claude.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`Claude CLI finalizou com código ${code}: ${errorBuffer}`));
        return;
      }

      await new Promise(r => setTimeout(r, 500));

      try {
        const content = await fs.promises.readFile(outputFilePath, 'utf-8');
        resolve(content);
      } catch {
        reject(new Error(`Arquivo de saída não criado: ${outputFileName}`));
      }
    });

    claude.on('error', (error) => {
      reject(new Error(`Falha ao executar Claude CLI: ${error.message}`));
    });
  });
}

ipcMain.handle('claude:assist', async (_event, action: string, _content: string, filePath: string, useTerminal: boolean) => {
  const workspaceDir = path.dirname(filePath);
  const fileName = path.basename(filePath);

  try {
    const result = await runClaudeCLI(workspaceDir, fileName, action, useTerminal);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Erro no Claude CLI: ${errorMessage}`);
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
