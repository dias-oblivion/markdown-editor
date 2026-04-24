# Unsaved Changes Protection

**Date:** 2026-04-24
**Status:** Approved

## Problem

When the user closes a tab or the entire application without saving, unsaved content is silently discarded. The session storage only persists open tab *paths*, so on restore the content is re-read from disk — losing any edits made since the last explicit save.

## Goals

1. Warn the user before closing a tab that has unsaved changes (modal with Save / Discard / Cancel).
2. Preserve unsaved content across app restarts via hot exit — so even a crash or abrupt close does not cause data loss.

## Non-Goals

- Auto-saving to disk periodically (preserves explicit save semantics).
- Handling files larger than ~5 MB (localStorage limit; not a realistic concern for markdown files).

## Approach: Modal + Hot Exit via localStorage

### 1. Storage Layer — `src/utils/sessionStorage.ts`

Extend `SessionData` with an optional `dirtyContent` map:

```typescript
interface SessionData {
  directoryPath: string | null;
  openTabPaths: string[];
  activeTabPath: string | null;
  dirtyContent?: Record<string, string>; // filePath → unsaved content
}
```

No new storage key is needed — `dirtyContent` is serialised inside the existing `markdown-editor-session` entry.

### 2. Hot Exit — `src/components/App.tsx`

Register a `beforeunload` listener that writes all dirty tab contents into the session before the window closes. Works identically in the browser and in Electron (the renderer fires `beforeunload` before the process exits).

```typescript
useEffect(() => {
  const handleBeforeUnload = () => {
    const dirtyContent: Record<string, string> = {};
    for (const tab of tabs) {
      if (tab.isDirty) dirtyContent[tab.path] = tab.content;
    }
    // Merge into the existing session so directory/tab-list are preserved
    const existing = getSession();
    if (existing) saveSession({ ...existing, dirtyContent });
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [tabs]);
```

### 3. Restore with Dirty Content — `src/hooks/useFileSystem.ts`

In `restoreTabs`, after reading the file from disk, check whether the session has a dirty snapshot for that path. If so, use the snapshot and mark the tab as dirty:

```typescript
const savedDirty = session.dirtyContent?.[tabPath];
restoredTabs.push({
  id: crypto.randomUUID(),
  name: fileEntry.name,
  path: fileEntry.path,
  content: savedDirty ?? content,      // prefer unsaved snapshot
  handle: fileEntry.handle as FileSystemFileHandle | undefined,
  isDirty: savedDirty !== undefined,   // re-mark as dirty if restored from snapshot
});
```

After a successful `saveFile`, clear that path from `dirtyContent` in storage.

### 4. Tab Close Interception — `src/components/App.tsx` + `src/components/Toolbar/Toolbar.tsx`

Add state in `App.tsx` to track a pending close request:

```typescript
const [closeRequestTabId, setCloseRequestTabId] = useState<string | null>(null);
```

Replace the direct `closeTab` prop with a `onTabCloseRequest` handler:

```typescript
function handleTabCloseRequest(tabId: string) {
  const tab = tabs.find(t => t.id === tabId);
  if (tab?.isDirty) {
    setCloseRequestTabId(tabId);   // open dialog
  } else {
    closeTab(tabId);
  }
}
```

The `Toolbar` prop is renamed from `onTabClose` to `onTabCloseRequest` to match.

### 5. New Component — `src/components/UnsavedChangesDialog/`

A dedicated dialog with three actions because `ConfirmDialog` only supports two. Follows the same CSS Module + overlay pattern as `ConfirmDialog`.

```
src/components/UnsavedChangesDialog/
  UnsavedChangesDialog.tsx
  UnsavedChangesDialog.module.css
```

Props:

```typescript
interface UnsavedChangesDialogProps {
  fileName: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}
```

Button layout (left → right): **Cancelar** · **Descartar** · **Salvar** (primary, auto-focused).

Keyboard: `Enter` activates focused button, `Escape` cancels, `←`/`→` moves focus between buttons.

### 6. Cleanup on Save / Discard

Whenever a dirty tab is saved or explicitly discarded, remove its entry from `dirtyContent` in storage:

```typescript
// after saveFile resolves
const session = getSession();
if (session?.dirtyContent) {
  const { [tab.path]: _, ...rest } = session.dirtyContent;
  saveSession({ ...session, dirtyContent: rest });
}
```

This prevents stale snapshots from reappearing on the next restore.

## Data Flow Summary

### Close tab (dirty)
```
User clicks × on dirty tab
  → onTabCloseRequest(tabId)
    → setCloseRequestTabId(tabId)   [show UnsavedChangesDialog]
      Save   → saveFile() → closeTab() → clear dirtyContent[path]
      Discard → closeTab() → clear dirtyContent[path]
      Cancel  → setCloseRequestTabId(null)
```

### App close / crash
```
beforeunload fires
  → collect dirty tabs → saveSession({ ...existing, dirtyContent })
Next open
  → restoreTabs reads dirtyContent from session
  → tab restored with unsaved content, isDirty: true
  → user saves normally → clear dirtyContent[path]
```

## Files Affected

| File | Change |
|---|---|
| `src/utils/sessionStorage.ts` | Add `dirtyContent` to `SessionData` |
| `src/hooks/useFileSystem.ts` | Use dirty snapshot on restore; expose helper to clear dirty entry |
| `src/components/App.tsx` | `beforeunload` handler; `handleTabCloseRequest`; render `UnsavedChangesDialog` |
| `src/components/Toolbar/Toolbar.tsx` | Rename `onTabClose` → `onTabCloseRequest` |
| `src/components/UnsavedChangesDialog/UnsavedChangesDialog.tsx` | New component |
| `src/components/UnsavedChangesDialog/UnsavedChangesDialog.module.css` | New styles |
