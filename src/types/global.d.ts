// AI Summary: Global type definitions for the application including file system interface,
// Tiktoken types, and store functionality. Defines core interfaces for file operations,
// command parsing, and application configuration. Extends Window interface with custom
// file system methods.
// Augment DragEvent to include custom file path data
interface AthanorDataTransfer extends DataTransfer {
  setData(format: 'application/x-athanor-filepath', data: string): void;
  getData(format: 'application/x-athanor-filepath'): string;
}

interface AthanorDragEvent extends DragEvent {
  dataTransfer: AthanorDataTransfer;
}

export {};

// Panel resizing types
export interface PanelResizeState {
  leftPanelWidth: number;
  isResizing: boolean;
  startResize: (e: React.MouseEvent<HTMLDivElement>) => void;
}

// Re-export action types from actions folder
export type { ActionType, ActionState } from '../actions';

// Re-export prompt and task types
export type { PromptData, PromptVariant } from './promptTypes';
export type { TaskData, TaskVariant } from './taskTypes';

// Task tab types for workbench multi-tab support
export interface TaskTab {
  id: string;
  name: string;
  content: string;
  output: string;
  context: string; // Added context field for task context tracking
}

export interface WorkbenchState {
  // Tab management
  tabs: TaskTab[];
  activeTabIndex: number;
  createTab: () => void;
  removeTab: (index: number) => void;
  setActiveTab: (index: number) => void;
  setTabContent: (index: number, text: string) => void;
  setTabOutput: (index: number, text: string) => void;
  setTabContext: (index: number, context: string) => void; // Added context setter
  
  // Legacy support and additional state
  taskDescription: string; // Maps to active tab content
  outputContent: string;   // Maps to active tab output
  taskContext: string;     // Added for legacy compatibility
  setTaskDescription: (text: string) => void;
  setOutputContent: (text: string) => void;
  setTaskContext: (context: string) => void; // Added context setter for legacy support
  resetTaskDescription: (text: string) => void;
  developerActionTrigger: number;
  triggerDeveloperAction: () => void;
  isGeneratingPrompt: boolean;
  setIsGeneratingPrompt: (isGenerating: boolean) => void;
  resetGeneratingPrompt: () => void;
}

declare global {
  interface Window {
    app: {
      getVersion: () => Promise<string>;
    };
    fileSystem: {
      openFolder: () => Promise<string | null>;
      readDirectory: (
        path: string,
        applyIgnores?: boolean
      ) => Promise<string[]>;
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
      addToIgnore: (itemPath: string, ignoreAll?: boolean) => Promise<boolean>;
      getMaterialsDir: () => Promise<string>;
      // Path utilities
      normalizeToUnix: (path: string) => Promise<string>;
      joinPaths: (path1: string, path2: string) => Promise<string>;
      getBaseName: (path: string) => Promise<string>;
      relativeToProject: (filePath: string) => Promise<string>;
      fileExists: (path: string) => Promise<boolean>;
    };
  }
}

// Project creation options
export interface ProjectCreationOptions {
  useStandardIgnore: boolean;
  importGitignore: boolean;
}

// File system lifecycle interface
export interface FileSystemLifecycle {
  currentDirectory: string;
  isRefreshing: boolean;
  appVersion: string;
  filesData: FileItem | null;
  materialsData: FileItem | null;
  handleOpenFolder: () => Promise<void>;
  refreshFileSystem: (silentOrNewPath?: boolean | string, newlyCreatedPath?: string) => Promise<void>;
  showProjectDialog: boolean;
  gitignoreExists: boolean;
  pendingDirectory: string | null;
  handleCreateProject: (useStandardIgnore: boolean, importGitignore: boolean) => Promise<void>;
  handleProjectDialogClose: () => void;
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
  documentation?: {
    includeNonSelected?: boolean;
  };
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