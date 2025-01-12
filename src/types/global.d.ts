// AI Summary: Global type definitions for the application including file system interface,
// Tiktoken types, and store functionality. Defines core interfaces for file operations,
// command parsing, and application configuration. Extends Window interface with custom
// file system methods.
export {};

// Panel resizing types
export interface PanelResizeState {
  leftPanelWidth: number;
  isResizing: boolean;
  startResize: (e: React.MouseEvent<HTMLDivElement>) => void;
}

declare global {
  interface Window {
    app: {
      getVersion: () => Promise<string>;
    };
    fileSystem: {
      openFolder: () => Promise<string | null>;
      readDirectory: (path: string) => Promise<string[]>;
      isDirectory: (path: string) => Promise<boolean>;
      getCurrentDirectory: () => Promise<string>;
      getResourcesPath: () => Promise<string>;
      getPromptTemplatePath: (templateName: string) => Promise<string>;
      reloadIgnoreRules: () => Promise<boolean>;
      toOSPath: (path: string) => Promise<string>;
      watchDirectory: (
        path: string,
        callback: (event: string, filename: string) => void
      ) => Promise<void>;
      isTextFile: (path: string) => Promise<boolean>;
      readFile: (
        path: string,
        options?: { encoding?: BufferEncoding | null } | BufferEncoding | null
      ) => Promise<string | ArrayBuffer>;
      writeFile: (path: string, data: string) => Promise<void>;
      deleteFile: (path: string) => Promise<void>;
      addToIgnore: (itemPath: string) => Promise<boolean>;
    };
  }
}

declare module 'js-tiktoken' {
  export class Tiktoken {
    encode(text: string): number[];
    decode(tokens: number[]): string;
    free(): void;
  }

  export type TiktokenModel = 'gpt-4' | 'gpt-3.5-turbo' | string;
  export type TiktokenEncoding = 'cl100k_base' | 'p50k_base' | string;

  export function getEncoding(
    encoding: TiktokenEncoding,
    extendSpecialTokens?: Record<string, number>
  ): Tiktoken;
  export function encodingForModel(
    model: TiktokenModel,
    extendSpecialTokens?: Record<string, number>
  ): Tiktoken;
}

// Command types
export type CommandType = 'apply changes' | 'select' | 'task';

// Type for configuration
export interface AthanorConfig {
  project_name?: string;
  project_info?: string;
  system_prompt?: string;
}

// File system store interface
export interface FileSystemStore {
  refreshFileSystem: () => Promise<void>;
  fileTree: FileItem[];
  setFileTree: (tree: FileItem[]) => void;
  selectedFileCount: number;
  selectedLinesTotal: number;
  getSelectedFileCount: () => number;
  getSelectedLinesTotal: () => number;
}

// Enhanced file operation types
export type FileOperationType =
  | 'CREATE'
  | 'UPDATE_FULL'
  | 'UPDATE_DIFF'
  | 'DELETE';

// Search/Replace block structure for diff updates
export interface DiffBlock {
  search: string;
  replace: string;
}

// Enhanced file operation interface
export interface FileBlock {
  file_message: [string];
  file_operation: [FileOperationType];
  file_path: [string];
  file_code: [string];
}

export interface AthCommand {
  $: { command: string };
  file: FileBlock[];
}

export interface FileOperation {
  file_message: string;
  file_operation: FileOperationType;
  file_path: string;
  new_code: string;
  old_code: string;
  accepted: boolean;
  rejected: boolean;
  diff_blocks?: DiffBlock[]; // Only used for UPDATE_DIFF operations
}
