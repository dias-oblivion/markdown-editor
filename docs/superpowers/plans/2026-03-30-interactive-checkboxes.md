# Interactive Checkboxes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make GFM task list checkboxes (`- [ ]` / `- [x]`) interactive in the preview — clicking toggles the state and updates the source markdown.

**Architecture:** After the HTML renders, a `useEffect` in `MarkdownPreview` removes the `disabled` attribute from each checkbox and attaches a `change` listener. The listener finds the N-th task list item in the source via regex, toggles it, and calls an `onToggleCheckbox` callback that flows up through `Editor.onChange` → `updateContent` → marks tab dirty for Ctrl+S save.

**Tech Stack:** React (useEffect, useRef), TypeScript, existing `remark-gfm` (no new deps)

---

## File Map

| File | Change |
|------|--------|
| `src/components/Editor/MarkdownPreview.tsx` | Add `source` + `onToggleCheckbox` props; new useEffect for checkbox interactivity |
| `src/components/Editor/Editor.tsx` | Pass `onToggleCheckbox` to `MarkdownPreview` |

---

### Task 1: Update `MarkdownPreview` to support interactive checkboxes

**Files:**
- Modify: `src/components/Editor/MarkdownPreview.tsx`

- [ ] **Step 1: Update the props interface**

Replace the existing interface at the top of the file:

```ts
interface MarkdownPreviewProps {
  source: string;
  onToggleCheckbox?: (newSource: string) => void;
}
```

The component signature becomes:

```ts
export function MarkdownPreview({ source, onToggleCheckbox }: MarkdownPreviewProps) {
```

- [ ] **Step 2: Add the checkbox interactivity useEffect**

Add this `useEffect` after the existing mermaid `useEffect` (after line 44, before the `return`):

```ts
useEffect(() => {
  if (!ref.current || !onToggleCheckbox) return;

  const checkboxes = ref.current.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
  checkboxes.forEach((checkbox, index) => {
    checkbox.removeAttribute('disabled');
    checkbox.addEventListener('change', () => {
      const matches = [...source.matchAll(/^[ \t]*[-*+] \[[ xX]\]/gm)];
      const match = matches[index];
      if (!match || match.index === undefined) return;

      const isChecked = checkbox.checked;
      const bracketOpen = match.index + match[0].indexOf('[');
      const bracketClose = match.index + match[0].indexOf(']');
      const newSource =
        source.slice(0, bracketOpen) +
        (isChecked ? '[x]' : '[ ]') +
        source.slice(bracketClose + 1);

      onToggleCheckbox(newSource);
    });
  });
}, [html, source, onToggleCheckbox]);
```

`remark-gfm` renders `- [ ]` as `<input type="checkbox" disabled>`. Removing `disabled` enables browser interaction. The regex `/^[ \t]*[-*+] \[[ xX]\]/gm` matches every task list item in the source; the N-th DOM checkbox maps to the N-th regex match.

- [ ] **Step 3: Verify the final file looks correct**

The complete `MarkdownPreview.tsx` should be:

```tsx
import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import elkLayouts from '@mermaid-js/layout-elk';
import { useMarkdown } from '../../hooks/useMarkdown';

interface MarkdownPreviewProps {
  source: string;
  onToggleCheckbox?: (newSource: string) => void;
}

mermaid.registerLayoutLoaders(elkLayouts);

function getMermaidTheme(): 'dark' | 'default' {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'default' : 'dark';
}

export function MarkdownPreview({ source, onToggleCheckbox }: MarkdownPreviewProps) {
  const html = useMarkdown(source);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !html) return;

    const blocks = ref.current.querySelectorAll<HTMLElement>('pre code.language-mermaid');
    if (!blocks.length) return;

    mermaid.initialize({ startOnLoad: false, theme: getMermaidTheme(), layout: 'elk' });

    blocks.forEach((block) => {
      const pre = block.parentElement;
      if (!pre) return;

      const code = block.textContent ?? '';
      const container = document.createElement('div');
      container.className = 'mermaid mermaid-diagram';
      container.textContent = code;
      pre.replaceWith(container);
    });

    mermaid
      .run({ nodes: Array.from(ref.current.querySelectorAll<HTMLElement>('.mermaid')) })
      .catch(console.error);
  }, [html]);

  useEffect(() => {
    if (!ref.current || !onToggleCheckbox) return;

    const checkboxes = ref.current.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    checkboxes.forEach((checkbox, index) => {
      checkbox.removeAttribute('disabled');
      checkbox.addEventListener('change', () => {
        const matches = [...source.matchAll(/^[ \t]*[-*+] \[[ xX]\]/gm)];
        const match = matches[index];
        if (!match || match.index === undefined) return;

        const isChecked = checkbox.checked;
        const bracketOpen = match.index + match[0].indexOf('[');
        const bracketClose = match.index + match[0].indexOf(']');
        const newSource =
          source.slice(0, bracketOpen) +
          (isChecked ? '[x]' : '[ ]') +
          source.slice(bracketClose + 1);

        onToggleCheckbox(newSource);
      });
    });
  }, [html, source, onToggleCheckbox]);

  return (
    <div
      ref={ref}
      className="markdown-preview"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Editor/MarkdownPreview.tsx
git commit -m "feat: add interactive checkbox support to MarkdownPreview"
```

---

### Task 2: Wire up `Editor` to pass the toggle callback

**Files:**
- Modify: `src/components/Editor/Editor.tsx`

- [ ] **Step 1: Pass `onToggleCheckbox` to `MarkdownPreview`**

Find the `<MarkdownPreview source={content} />` usage in `Editor.tsx` (inside the `previewPane` div) and replace it with:

```tsx
<MarkdownPreview
  source={content}
  onToggleCheckbox={viewMode === 'preview' ? (newSource) => onChange(newSource) : undefined}
/>
```

The `onToggleCheckbox` is only passed when `viewMode === 'preview'` to avoid attaching listeners when the preview pane is hidden.

- [ ] **Step 2: Manual test**

Run the app:
```bash
npm run dev
```

Open a `.md` file and add a task list:
```
- [ ] buy milk
- [x] write code
- [ ] review PR
```

Switch to Preview mode. Verify:
1. Checkboxes are visible and clickable (not grayed out)
2. Clicking an unchecked box renders it checked and the source updates to `[x]`
3. Clicking a checked box unchecks it and the source updates to `[ ]`
4. The tab shows as dirty (unsaved indicator)
5. Ctrl+S saves — reopening the file shows the updated state

- [ ] **Step 3: Commit**

```bash
git add src/components/Editor/Editor.tsx
git commit -m "feat: wire checkbox toggle from Editor to MarkdownPreview"
```
