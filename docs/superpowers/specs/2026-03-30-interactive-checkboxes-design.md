# Interactive Checkboxes in Preview — Design Spec

**Date:** 2026-03-30

## Overview

Add interactive GFM task list checkboxes to the preview mode. When the user clicks a checkbox in the preview, the change is reflected in the source markdown (`[ ]` ↔ `[x]`) and saved to the file.

## Syntax

Standard GitHub Flavored Markdown task list syntax (already supported by `remark-gfm`):

```
- [ ] pending task
- [x] completed task
```

Both `[ ]` and `[x]` (case-insensitive) are supported. The `- ` prefix is required (list item).

## Architecture

No new dependencies. Two files change: `MarkdownPreview.tsx` and `Editor.tsx`.

### Data Flow

```
User clicks checkbox in preview
  → useEffect listener fires (index N)
  → scan source with regex /^[ \t]*[-*+] \[[ xX]\]/gm
  → locate N-th match
  → toggle: [ ] → [x] or [x] → [ ]
  → call onToggleCheckbox(newSource)
    → Editor.onChange(newSource)
      → updateContent(tabId, newSource) — marks tab dirty
        → Ctrl+S saves to file
```

### `MarkdownPreview` changes

New props:

```ts
interface MarkdownPreviewProps {
  source: string;
  onToggleCheckbox?: (newSource: string) => void;
}
```

New `useEffect` (runs when `html` changes):

```ts
useEffect(() => {
  if (!ref.current || !onToggleCheckbox) return;

  const checkboxes = ref.current.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
  checkboxes.forEach((checkbox, index) => {
    checkbox.removeAttribute('disabled');
    checkbox.addEventListener('change', () => {
      const matches = [...source.matchAll(/^[ \t]*[-*+] \[[ xX]\]/gm)];
      const match = matches[index];
      if (!match) return;

      const isChecked = checkbox.checked;
      const bracketOpen = match.index! + match[0].indexOf('[');
      const bracketClose = match.index! + match[0].indexOf(']');
      const newSource =
        source.slice(0, bracketOpen) +
        (isChecked ? '[x]' : '[ ]') +
        source.slice(bracketClose + 1);

      onToggleCheckbox(newSource);
    });
  });
}, [html, source, onToggleCheckbox]);
```

`remark-gfm` already renders `- [ ]` as `<input type="checkbox" disabled>`. The effect removes `disabled` to enable interaction.

### `Editor` changes

Pass `onToggleCheckbox` only when in preview mode (avoids attaching unused listeners in editor-only mode):

```tsx
<MarkdownPreview
  source={content}
  onToggleCheckbox={viewMode === 'preview' ? (newSource) => onChange(newSource) : undefined}
/>
```

## Scope

- GFM task list items only (`- [ ]` / `- [x]`)
- Works in preview mode; editor mode is unaffected
- No auto-save on click — marks tab dirty, user saves with Ctrl+S (existing behavior)
- Case-insensitive matching for `[x]` / `[X]`; always writes lowercase `[x]`
