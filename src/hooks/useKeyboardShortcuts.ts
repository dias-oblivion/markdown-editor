import { useEffect } from 'react';

interface ShortcutHandlers {
  onSave?: () => void;
  onCommandPalette?: () => void;
  onFind?: () => void;
  onNewFile?: () => void;
  onTogglePreview?: () => void;
  onToggleFocus?: () => void;
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

      // F11 — toggle immersive focus (reading) mode
      if (e.key === 'F11') {
        e.preventDefault();
        handlers.onToggleFocus?.();
      }

      if (ctrl && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        handlers.onToggleChat?.();
      }

      // Inline formatting (Ctrl)
      if (ctrl && !e.shiftKey && e.key === 'b') {
        e.preventDefault();
        handlers.onFormatBold?.();
      }

      if (ctrl && !e.shiftKey && e.key === 'i') {
        e.preventDefault();
        handlers.onFormatItalic?.();
      }

      if (ctrl && !e.shiftKey && e.key === 'u') {
        e.preventDefault();
        handlers.onFormatUnderline?.();
      }

      if (ctrl && !e.shiftKey && e.key === 'k') {
        e.preventDefault();
        handlers.onFormatLink?.();
      }

      // Block / insert actions (Ctrl+Shift)
      if (ctrl && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        handlers.onFormatStrikethrough?.();
      }

      if (ctrl && e.shiftKey && e.key === 'O') {
        e.preventDefault();
        handlers.onInsertOrderedList?.();
      }

      if (ctrl && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        handlers.onInsertBulletedList?.();
      }

      if (ctrl && e.shiftKey && e.key === 'Q') {
        e.preventDefault();
        handlers.onInsertBlockquote?.();
      }

      if (ctrl && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        handlers.onOpenCodeDialog?.();
      }

      if (ctrl && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        handlers.onOpenTableDialog?.();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
