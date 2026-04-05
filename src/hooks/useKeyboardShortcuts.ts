import { useEffect } from 'react';

interface ShortcutHandlers {
  onSave?: () => void;
  onCommandPalette?: () => void;
  onFind?: () => void;
  onNewFile?: () => void;
  onTogglePreview?: () => void;
  onToggleSidebar?: () => void;
  onToggleChat?: () => void;
  onFormatBold?: () => void;
  onFormatItalic?: () => void;
  onFormatStrikethrough?: () => void;
  onFormatUnderline?: () => void;
  onFormatLink?: () => void;
  onInsertOrderedList?: () => void;
  onInsertBulletedList?: () => void;
  onInsertBlockquote?: () => void;
  onOpenCodeDialog?: () => void;
  onOpenTableDialog?: () => void;
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

      if (ctrl && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        handlers.onTogglePreview?.();
      }

      if (ctrl && e.key === 'b') {
        e.preventDefault();
        handlers.onToggleSidebar?.();
      }

      if (ctrl && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        handlers.onToggleChat?.();
      }

      if (e.altKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        handlers.onFormatBold?.();
      }

      if (e.altKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        handlers.onFormatItalic?.();
      }

      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handlers.onFormatStrikethrough?.();
      }

      if (e.altKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        handlers.onFormatUnderline?.();
      }

      if (e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        handlers.onFormatLink?.();
      }

      if (e.altKey && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        handlers.onInsertOrderedList?.();
      }

      if (e.altKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        handlers.onInsertBulletedList?.();
      }

      if (e.altKey && (e.key === 'q' || e.key === 'Q')) {
        e.preventDefault();
        handlers.onInsertBlockquote?.();
      }

      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        handlers.onOpenCodeDialog?.();
      }

      if (e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        handlers.onOpenTableDialog?.();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
