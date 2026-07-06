# Drag & Drop de Arquivos — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir arrastar arquivos entre pastas na sidebar do explorador, apenas em modo Electron.

**Architecture:** HTML5 Drag & Drop nativo no `FileTree`. Novo IPC `fs:moveFile` no Electron. `useFileSystem` expõe `moveFile` que atualiza tabs abertas e refresca a árvore.

**Tech Stack:** React, TypeScript, Electron IPC, HTML5 Drag & Drop API, CSS Modules

---

## Mapeamento de arquivos

| Arquivo | Mudança |
|---|---|
| `electron/main.ts` | Novo handler `fs:moveFile` |
| `electron/preload.ts` | Expor `moveFile` no contextBridge |
| `src/utils/fileSystem.ts` | Atualizar `ElectronAPI` interface + nova função `moveFile` |
| `src/hooks/useFileSystem.ts` | Nova callback `handleMoveFile`, exposta como `moveFile` |
| `src/components/App.tsx` | Passar `onMoveFile={moveFile}` para `<Sidebar>` |
| `src/components/Sidebar/Sidebar.tsx` | Receber e repassar `onMoveFile` para `<FileTree>` |
| `src/components/Sidebar/FileTree.tsx` | Lógica de drag & drop + prop `onMoveFile` |
| `src/components/Sidebar/Sidebar.module.css` | Estilo `.dragOver` para highlight de pasta |

---

### Task 1: IPC handler `fs:moveFile` no main process

**Files:**
- Modify: `electron/main.ts` (após o handler `fs:deleteDirectory`, linha ~136)
- Modify: `electron/preload.ts`

- [ ] **Step 1: Adicionar handler em `electron/main.ts`**

Inserir após o bloco `ipcMain.handle('fs:deleteDirectory', ...)`:

```ts
ipcMain.handle('fs:moveFile', async (_event, oldPath: string, targetDirPath: string) => {
  const fileName = path.basename(oldPath);
  const newPath = path.join(targetDirPath, fileName);
  await fs.promises.rename(oldPath, newPath);
  return newPath;
});
```

- [ ] **Step 2: Expor no contextBridge em `electron/preload.ts`**

Adicionar ao objeto dentro de `contextBridge.exposeInMainWorld`:

```ts
moveFile: (oldPath: string, targetDirPath: string) =>
  ipcRenderer.invoke('fs:moveFile', oldPath, targetDirPath),
```

---

### Task 2: Função `moveFile` em `fileSystem.ts`

**Files:**
- Modify: `src/utils/fileSystem.ts`

- [ ] **Step 1: Adicionar `moveFile` à interface `ElectronAPI`**

Na interface `ElectronAPI` (linha ~6), adicionar:

```ts
moveFile: (oldPath: string, targetDirPath: string) => Promise<string>;
```

- [ ] **Step 2: Exportar a função `moveFile`**

Adicionar ao final do arquivo, antes de `flattenFiles`:

```ts
/** Move a file to a different directory. Returns the new path. Electron-only. */
export async function moveFile(entry: FileEntry, targetDirEntry: FileEntry): Promise<string> {
  const api = getElectronAPI();
  if (!api) throw new Error('moveFile requires Electron');
  return api.moveFile(entry.path, targetDirEntry.path);
}
```

---

### Task 3: `handleMoveFile` em `useFileSystem.ts`

**Files:**
- Modify: `src/hooks/useFileSystem.ts`

- [ ] **Step 1: Importar `moveFile` de `fileSystem.ts`**

No topo do arquivo, adicionar `moveFile` aos imports existentes de `../utils/fileSystem`:

```ts
import {
  // ... existentes ...
  moveFile,
} from '../utils/fileSystem';
```

- [ ] **Step 2: Adicionar `handleMoveFile` callback**

Inserir após `handleRefresh` (antes do `return`):

```ts
const handleMoveFile = useCallback(async (filePath: string, targetDirPath: string) => {
  const root = rootEntry;
  if (!root) return;

  const fileEntry = findFileByPath(root, filePath);
  const targetDirEntry = findDirByPath(root, targetDirPath);
  if (!fileEntry || !targetDirEntry) return;

  // No-op: file is already in the target directory
  const currentDirPath = filePath.substring(0, filePath.lastIndexOf('/'));
  if (currentDirPath === targetDirPath) return;

  const newPath = await moveFile(fileEntry, targetDirEntry);

  // Update any open tab that was pointing to the moved file
  const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
  setTabs(prev =>
    prev.map(t =>
      t.path === filePath
        ? { ...t, path: newPath, name: fileName }
        : t
    )
  );

  // Refresh the directory tree
  const refreshed = await refreshDirectoryTree(root);
  if (refreshed) {
    setRootEntry(refreshed);
    rootPathRef.current = refreshed.path;
  }
}, [rootEntry]);
```

- [ ] **Step 3: Expor no return do hook**

No objeto de retorno do hook (onde estão `renameFile`, `deleteFile`, etc.), adicionar:

```ts
moveFile: handleMoveFile,
```

---

### Task 4: Wiring em `App.tsx` e `Sidebar.tsx`

**Files:**
- Modify: `src/components/App.tsx`
- Modify: `src/components/Sidebar/Sidebar.tsx`

- [ ] **Step 1: Desestruturar `moveFile` do hook em `App.tsx`**

No bloco de desestruturação de `useFileSystem()` (linha ~69), adicionar:

```ts
moveFile,
```

- [ ] **Step 2: Passar `onMoveFile` para `<Sidebar>` em `App.tsx`**

No JSX onde `<Sidebar>` é renderizado (linha ~254), adicionar a prop:

```tsx
onMoveFile={moveFile}
```

- [ ] **Step 3: Adicionar prop `onMoveFile` em `Sidebar.tsx`**

Na interface `SidebarProps`, adicionar:

```ts
onMoveFile: (filePath: string, targetDirPath: string) => Promise<void>;
```

Na desestruturação da função `Sidebar`, adicionar `onMoveFile`.

- [ ] **Step 4: Passar `onMoveFile` para `<FileTree>` em `Sidebar.tsx`**

No JSX do `<FileTree>`, adicionar:

```tsx
onMoveFile={onMoveFile}
```

---

### Task 5: Drag & Drop em `FileTree.tsx`

**Files:**
- Modify: `src/components/Sidebar/FileTree.tsx`

- [ ] **Step 1: Adicionar prop `onMoveFile` à interface `FileTreeProps`**

```ts
onMoveFile: (filePath: string, targetDirPath: string) => void;
```

- [ ] **Step 2: Adicionar `dragOverPath` state e repassar `onMoveFile` nas chamadas recursivas**

No corpo da função `FileTree`, antes dos returns:

```ts
const [dragOverPath, setDragOverPath] = useState<string | null>(null);
```

Em cada `<FileTree>` renderizado recursivamente dentro do diretório expandido, adicionar:

```tsx
onMoveFile={onMoveFile}
```

- [ ] **Step 3: Tornar nós de arquivo arrastáveis**

No `<div>` do nó de arquivo (o que tem `className={styles.treeItem}`), adicionar:

```tsx
draggable={true}
onDragStart={(e) => {
  e.dataTransfer.setData('text/plain', entry.path);
  e.dataTransfer.effectAllowed = 'move';
}}
```

- [ ] **Step 4: Adicionar handlers de drop nos nós de pasta**

No `<div>` do nó de diretório (o que tem `onClick={() => setExpanded(!expanded)}`), adicionar:

```tsx
onDragOver={(e) => {
  e.preventDefault();
  e.stopPropagation(); // Evita que pastas pai também fiquem highlighted
  e.dataTransfer.dropEffect = 'move';
  setDragOverPath(entry.path);
}}
onDragLeave={(e) => {
  // Only clear if leaving to outside this folder item (not into a child)
  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
    setDragOverPath(null);
  }
}}
onDrop={(e) => {
  e.preventDefault();
  e.stopPropagation();
  setDragOverPath(null);
  const filePath = e.dataTransfer.getData('text/plain');
  if (filePath) {
    onMoveFile(filePath, entry.path);
  }
}}
className={`${styles.treeItem} ${dragOverPath === entry.path ? styles.dragOver : ''}`}
```

> **Nota:** o `className` existente do nó de pasta precisa ser substituído por esta versão que inclui `dragOver` condicional.

---

### Task 6: Estilo `.dragOver` em `Sidebar.module.css`

**Files:**
- Modify: `src/components/Sidebar/Sidebar.module.css`

- [ ] **Step 1: Adicionar classes de drag & drop**

Adicionar ao final do arquivo:

```css
/* Drag & Drop */
.dragOver {
  background: var(--accent-muted);
  color: var(--accent-primary);
  outline: 1px solid var(--accent-primary);
  border-radius: var(--radius-sm);
}

.treeItem[draggable='true'] {
  cursor: grab;
}

.treeItem[draggable='true']:active {
  cursor: grabbing;
}
```

---

## Verificação manual

Após implementar todos os tasks:

1. `npm run dev` para iniciar
2. Abrir uma pasta com subpastas no Electron
3. Arrastar um arquivo para outra pasta — deve mover e a árvore recarregar
4. Arrastar arquivo para a mesma pasta — nada deve acontecer (sem-op)
5. Abrir um arquivo em tab, depois movê-lo — o caminho da tab deve ser atualizado
