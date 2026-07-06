const SESSION_KEY = 'markdown-editor-session';

export interface SessionData {
  /** Path of the user's "Files" folder (independent from Claude Plans). */
  directoryPath: string | null;
  openTabPaths: string[];
  activeTabPath: string | null;
  /** Hot-exit: unsaved buffer of each dirty tab, keyed by file path. */
  dirtyContent?: Record<string, string>;
  /** Hot-exit: unsaved buffer typed with no file open (scratch pad). */
  scratchContent?: string;
  /** Which sidebar source was active: user files or ~/.claude/plans. */
  sidebarSource?: 'files' | 'plans';
  /** Claude Plans the user has already opened (to highlight new ones). */
  openedPlans?: string[];
}

export function saveSession(data: SessionData): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable
  }
}

/** Merge a partial update into the persisted session without clobbering other keys. */
export function patchSession(partial: Partial<SessionData>): void {
  const existing = getSession();
  const base: SessionData = existing ?? {
    directoryPath: null,
    openTabPaths: [],
    activeTabPath: null,
  };
  saveSession({ ...base, ...partial });
}

export function getSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore
  }
}
