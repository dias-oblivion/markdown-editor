import { useEffect } from 'react';

interface ShortcutHandlers {
  onSave?: () => void;
  onCommandPalette?: () => void;
  onFind?: () => void;
  onNewFile?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 's') {
        e.preventDefault();
        handlers.onSave?.();
      }

      if (ctrl && e.key === 'p') {
        e.preventDefault();
        handlers.onCommandPalette?.();
      }

      if (ctrl && e.key === 'f') {
        e.preventDefault();
        handlers.onFind?.();
      }

      if (ctrl && e.key === 'n') {
        e.preventDefault();
        handlers.onNewFile?.();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
