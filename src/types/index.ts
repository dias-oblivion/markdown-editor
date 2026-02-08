export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
  handle?: FileSystemDirectoryHandle | FileSystemFileHandle;
}

export interface EditorTab {
  id: string;
  name: string;
  path: string;
  content: string;
  handle?: FileSystemFileHandle;
  isDirty: boolean;
}

export type ViewMode = 'editor' | 'preview';

export type FormatAction =
  | 'bold'
  | 'italic'
  | 'highlight'
  | 'strikethrough'
  | 'superscript'
  | 'subscript';

export interface TableConfig {
  rows: number;
  cols: number;
  headers: string[];
  data: string[][];
}

export interface CodeBlockConfig {
  language: string;
  code: string;
  useTabs: boolean;
}
