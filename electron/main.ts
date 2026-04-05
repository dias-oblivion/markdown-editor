import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { spawn, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// AI Provider settings
interface AISettings {
  provider: 'claude' | 'copilot' | 'opencode';
  terminalVisible: boolean;
}

interface AIProviderConfig {
  name: string;
  cliCommand: string;
  cliArgs?: string[];
}

const AI_PROVIDER_CONFIGS: Record<AISettings['provider'], AIProviderConfig> = {
  claude: {
    name: 'Claude Chat',
    cliCommand: 'claude',
    cliArgs: ['--dangerously-skip-permissions'],
  },
  copilot: {
    name: 'Copilot Chat',
    cliCommand: 'copilot',
    cliArgs: ['--allow-all-tools'],
  },
  opencode: {
    name: 'Opencode Chat',
    cliCommand: 'opencode',
    cliArgs: ['run'],
  },
};

// Default AI settings
let aiSettings: AISettings = {
  provider: 'claude',
  terminalVisible: false,
};

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
    // mainWindow.webContents.openDevTools();
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

ipcMain.handle('fs:createDirectory', async (_event, parentPath: string, name: string) => {
  const dirPath = path.join(parentPath, name);
  await fs.promises.mkdir(dirPath, { recursive: true });
  return dirPath;
});

ipcMain.handle('fs:renameDirectory', async (_event, oldPath: string, newName: string) => {
  const dir = path.dirname(oldPath);
  const newPath = path.join(dir, newName);
  await fs.promises.rename(oldPath, newPath);
  return newPath;
});

ipcMain.handle('fs:deleteDirectory', async (_event, dirPath: string) => {
  await fs.promises.rm(dirPath, { recursive: true, force: true });
});

ipcMain.handle('fs:moveFile', async (_event, oldPath: string, targetDirPath: string) => {
  const fileName = path.basename(oldPath);
  const newPath = path.join(targetDirPath, fileName);
  await fs.promises.rename(oldPath, newPath);
  return newPath;
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

// Get CLI command and args based on provider
function getCLIConfig(provider: AISettings['provider']): { command: string; buildArgs: (prompt: string) => string[] } {
  switch (provider) {
    case 'claude':
      return { command: 'claude', buildArgs: (p) => ['--dangerously-skip-permissions', '-p', p] };
    case 'copilot':
      return { command: 'copilot', buildArgs: (p) => ['-p', p, '--allow-all-tools'] };
    case 'opencode':
      return { command: 'opencode', buildArgs: (p) => ['run', p] };
    default:
      return { command: 'claude', buildArgs: (p) => ['--dangerously-skip-permissions', '-p', p] };
  }
}

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
  const cliConfig = getCLIConfig(aiSettings.provider);
  const providerName = AI_PROVIDER_CONFIGS[aiSettings.provider].name;

  if (useTerminal) {
    // Abre um xterm visível com o processo do AI CLI
    const promptPath = path.join(workspaceDir, `.ai-assist-prompt.txt`);
    const scriptPath = path.join(workspaceDir, `.ai-assist-run.sh`);

    await fs.promises.writeFile(promptPath, prompt, 'utf-8');

    const cliCommand = `${cliConfig.command} ${cliConfig.buildArgs('"$PROMPT"').join(' ')}`;

    const script = `#!/bin/bash
cd "${workspaceDir}"
echo "=== ${providerName} Assist ==="
echo "Ação:    ${action}"
echo "Entrada: ${fileName}"
echo "Saída:   ${outputFileName}"
echo "====================="
echo ""
echo "--- Prompt ---"
cat "${promptPath}"
echo ""
echo "--- Iniciando ${providerName} CLI ---"
echo ""
PROMPT=$(cat "${promptPath}")
${cliCommand}
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
      const terminal = spawn('xterm', ['-title', `${providerName} Assist`, '-e', `bash "${scriptPath}"`], {
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
    const cliArgs = cliConfig.buildArgs(prompt);
    const cliProcess = spawn(cliConfig.command, cliArgs, {
      cwd: workspaceDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let errorBuffer = '';

    cliProcess.stderr.on('data', (data: Buffer) => {
      errorBuffer += data.toString();
    });

    cliProcess.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`${providerName} CLI finalizou com código ${code}: ${errorBuffer}`));
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

    cliProcess.on('error', (error) => {
      reject(new Error(`Falha ao executar ${providerName} CLI: ${error.message}`));
    });
  });
}

// ── AI Settings Update ──

ipcMain.on('ai:updateSettings', (_event, settings: AISettings) => {
  aiSettings = settings;
});

// ── AI Chat (streaming) ──

ipcMain.on('claude:chat-message', (event, { prompt, workspaceDir }: { prompt: string; workspaceDir?: string }) => {
  const cwd = workspaceDir || process.cwd();
  const cliConfig = getCLIConfig(aiSettings.provider);
  const providerName = AI_PROVIDER_CONFIGS[aiSettings.provider].name;

  // If terminal is visible, use xterm for chat streaming
  if (aiSettings.terminalVisible) {
    const promptPath = path.join(cwd, `.ai-chat-prompt.txt`);
    const scriptPath = path.join(cwd, `.ai-chat-run.sh`);
    const exitCodePath = path.join(cwd, `.ai-chat-exitcode.txt`);

    fs.promises.writeFile(promptPath, prompt, 'utf-8').then(() => {
      const cliCommand = `${cliConfig.command} ${cliConfig.buildArgs('"$PROMPT"').join(' ')}`;

      const script = `#!/bin/bash
cd "${cwd}"
echo "=== ${providerName} ==="
echo "====================="
PROMPT=$(cat "${promptPath}")
${cliCommand}
EXIT_CODE=$?
echo $EXIT_CODE > "${exitCodePath}"
echo ""
echo "====================="
echo "Código de saída: $EXIT_CODE"
if [ $EXIT_CODE -ne 0 ]; then
  echo "ERRO: Comando falhou. Verifique se '${cliConfig.command}' está instalado e configurado corretamente."
fi
read -p "Pressione Enter para fechar..."
rm -f "${promptPath}" "${scriptPath}"
`;

      fs.promises.writeFile(scriptPath, script, 'utf-8').then(() => {
        fs.promises.chmod(scriptPath, 0o755).then(() => {
          const terminal = spawn('xterm', ['-title', providerName, '-e', `bash "${scriptPath}"`], {
            cwd,
            stdio: 'ignore',
          });

          terminal.on('close', async () => {
            // Read exit code from file
            try {
              const exitCodeStr = await fs.promises.readFile(exitCodePath, 'utf-8');
              const exitCode = parseInt(exitCodeStr.trim(), 10);
              await fs.promises.unlink(exitCodePath).catch(() => {});

              if (exitCode === 0) {
                event.sender.send('claude:stream-done', { success: true });
              } else {
                event.sender.send('claude:stream-done', {
                  success: false,
                  error: `${providerName} finalizou com código ${exitCode}. Verifique se o comando '${cliConfig.command}' está instalado e configurado corretamente.`
                });
              }
            } catch {
              // If can't read exit code file, assume it was closed without running
              event.sender.send('claude:stream-done', {
                success: false,
                error: `Terminal fechado sem executar o comando. Verifique se '${cliConfig.command}' está disponível.`
              });
            }
          });

          terminal.on('error', (error) => {
            event.sender.send('claude:stream-done', {
              success: false,
              error: `Falha ao abrir xterm: ${error.message}. Instale com: sudo apt install xterm`
            });
          });

          // In terminal mode, send a simple message since user will see output in terminal
          event.sender.send('claude:stream-token', `Abrindo ${providerName} no terminal...\n\n`);
        });
      });
    });
  } else {
    // Hidden mode: spawn in background with streaming
    const cliArgs = cliConfig.buildArgs(prompt);
    const aiProcess = spawn(cliConfig.command, cliArgs, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let errorBuffer = '';

    aiProcess.stdout.on('data', (data: Buffer) => {
      event.sender.send('claude:stream-token', data.toString());
    });

    aiProcess.stderr.on('data', (data: Buffer) => {
      errorBuffer += data.toString();
    });

    aiProcess.on('close', (code: number) => {
      if (code === 0) {
        event.sender.send('claude:stream-done', { success: true });
      } else {
        const errorMsg = errorBuffer || `${providerName} finalizou com código ${code}. Verifique se o comando '${cliConfig.command}' está instalado e configurado corretamente.`;
        event.sender.send('claude:stream-done', { success: false, error: errorMsg });
      }
    });

    aiProcess.on('error', (error) => {
      const errorMsg = `Falha ao executar ${providerName}: ${error.message}. Verifique se o comando '${cliConfig.command}' está instalado.`;
      event.sender.send('claude:stream-done', { success: false, error: errorMsg });
    });
  }
});

ipcMain.handle('claude:assist', async (_event, action: string, _content: string, filePath: string, _useTerminal?: boolean) => {
  const workspaceDir = path.dirname(filePath);
  const fileName = path.basename(filePath);

  // Use the terminal visibility from settings, but allow override from parameter
  const useTerminal = _useTerminal !== undefined ? _useTerminal : aiSettings.terminalVisible;

  try {
    const result = await runClaudeCLI(workspaceDir, fileName, action, useTerminal);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const providerName = AI_PROVIDER_CONFIGS[aiSettings.provider].name;
    throw new Error(`Erro no ${providerName}: ${errorMessage}`);
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
