# Design: Drag & Drop de Arquivos na Sidebar

**Data:** 2026-03-30
**Status:** Aprovado

## Objetivo

Permitir que o usuário arraste arquivos entre pastas na barra lateral do explorador, sem precisar sair da aplicação.

## Escopo

- Apenas **arquivos** (não pastas)
- Apenas **Electron** (modo browser não precisa suportar)
- Nenhuma dependência externa — HTML5 Drag & Drop nativo

## Arquitetura

### 1. `electron/main.ts`

Novo IPC handler:

```ts
ipcMain.handle('fs:moveFile', async (_event, oldPath: string, targetDirPath: string) => {
  const fileName = path.basename(oldPath);
  const newPath = path.join(targetDirPath, fileName);
  await fs.promises.rename(oldPath, newPath);
  return newPath;
});
```

### 2. `electron/preload.ts`

Expor no `contextBridge`:

```ts
moveFile: (oldPath: string, targetDirPath: string) => ipcRenderer.invoke('fs:moveFile', oldPath, targetDirPath),
```

E adicionar `moveFile` à interface `ElectronAPI` em `fileSystem.ts`.

### 3. `src/utils/fileSystem.ts`

Nova função exportada:

```ts
export async function moveFile(entry: FileEntry, targetDirEntry: FileEntry): Promise<string> {
  const api = getElectronAPI();
  if (!api) throw new Error('moveFile requires Electron');
  return api.moveFile(entry.path, targetDirEntry.path);
}
```

### 4. `src/components/Sidebar/FileTree.tsx`

Nova prop: `onMoveFile: (filePath: string, targetDirPath: string) => void`

**Em nós de arquivo:**
- `draggable={true}`
- `onDragStart`: armazena `entry.path` em `dataTransfer.setData('text/plain', entry.path)`

**Em nós de pasta:**
- Estado local `dragOverPath: string | null` para controlar highlight
- `onDragOver`: `e.preventDefault()` + `setDragOverPath(entry.path)`
- `onDragLeave`: `setDragOverPath(null)`
- `onDrop`: lê o path do `dataTransfer`, chama `onMoveFile(filePath, entry.path)`, limpa `dragOverPath`
- Classe CSS `dragOver` aplicada quando `dragOverPath === entry.path`

**Restrição:** não chamar `onMoveFile` se o destino já é o diretório atual do arquivo (sem-op).

### 5. `src/components/Sidebar/Sidebar.tsx`

- Recebe novo prop: `onMoveFile: (filePath: string, targetDirPath: string) => void`
- Repassa para `<FileTree>`

### 6. `src/components/App.tsx`

Nova função `handleMoveFile`:

1. Chama `moveFile(entry, targetDirEntry)` via `fileSystem.ts`
2. Chama `refreshDirectoryTree()` para refletir a mudança na árvore
3. Se o arquivo movido está aberto em uma tab, atualiza o `path` da tab para o novo caminho

### 7. CSS (`Sidebar.module.css`)

Novo estilo para drop zone ativa:

```css
.treeItem.dragOver {
  outline: 1px solid var(--accent);
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  border-radius: 4px;
}
```

Cursor durante drag:

```css
.treeItem[draggable="true"] {
  cursor: grab;
}
```

## Fluxo de dados

```
User drags file → dragStart stores path in dataTransfer
User drops on folder → drop reads path → onMoveFile(filePath, targetDirPath)
  → Sidebar.onMoveFile → App.handleMoveFile
    → fileSystem.moveFile (IPC: fs:moveFile)
    → refreshDirectoryTree (atualiza FileTree)
    → update open tab path (se necessário)
```

## Casos de borda

- **Drop na mesma pasta:** verificar se `path.dirname(filePath) === targetDirPath`; se sim, ignorar.
- **Arquivo com mesmo nome já existe no destino:** `fs.promises.rename` sobrescreve no Linux/macOS. Aceitável por ora.
- **Tab aberta do arquivo movido:** o `path` da tab deve ser atualizado para o novo caminho para manter o editor funcional.

## O que não está no escopo

- Mover pastas
- Suporte browser
- Reordenação dentro da mesma pasta
- Drag & drop de arquivos externos para dentro do app
