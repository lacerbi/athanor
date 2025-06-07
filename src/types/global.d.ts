// AI Summary: Global type definitions for Athanor. Includes interfaces for Electron bridge (file system, LLM service, UI, API keys, settings),
// application state (task tabs, panel resizing), core types (FileItem, FileOperation, commands), and external libraries (Tiktoken).
// Defines window extensions for IPC and custom DragEvent types. Updated to reflect new LLM ModelInfo structure in electronBridge.
// Augment DragEvent to include custom file path data
interface AthanorDataTransfer extends DataTransfer {
  setData(format: 'application/x-athanor-filepath', data: string): void;
  getData(format: 'application/x-athanor-filepath'): string;
}

interface AthanorDragEvent extends DragEvent {
  dataTransfer: AthanorDataTransfer;
}

export {};

// Settings types
export interface ProjectSettings {
  projectNameOverride?: string;
  projectInfoFilePath?: string;
  includeAiSummaries?: boolean;
  useGitignore?: boolean;
  // Future expansion: other project-specific settings
}

export interface ApplicationSettings {
  // Example application settings for demonstration
  enableExperimentalFeatures?: boolean;
  minSmartPreviewLines?: number;
  maxSmartPreviewLines?: number;
  thresholdLineLength?: number;
  lastSelectedApiPresetId?: string | null;
  lastOpenedProjectPath?: string | null;
  uiTheme?: string;

  // Future expansion: more global settings
  // defaultLargeFileWarningThreshold?: number;
}

// Panel resizing types
export interface PanelResizeState {
  leftPanelWidth: number;
  isResizing: boolean;
  startResize: (e: React.MouseEvent<HTMLDivElement>) => void;
}

// Re-export action types from actions folder
export type { ActionState } from '../actions';

// Re-export prompt and task types
export type { PromptData, PromptVariant } from './promptTypes';
export type { TaskData, TaskVariant } from './taskTypes';

// Re-export log types
export type { LogEntry } from '../stores/logStore';

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
  outputContent: string; // Maps to active tab output
  taskContext: string; // Added for legacy compatibility
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
      getUserDataPath: () => Promise<string>;
      getInitialPath: () => Promise<string | null>;
    };

    // Native theme bridge for system theme detection
    nativeThemeBridge: {
      getInitialDarkMode: () => Promise<boolean>;
      onNativeThemeUpdated: (callback: (shouldUseDarkColors: boolean) => void) => () => void;
    };

    // Electron bridge for secure operations
    electronBridge: {
      secureApiKeyManager: {
        /**
         * Stores an API key securely
         */
        storeKey: (
          providerId: string,
          apiKey: string
        ) => Promise<{ success: boolean }>;

        // getKey: REMOVED for security - plaintext keys should never be accessible to renderer

        /**
         * Deletes an API key
         */
        deleteKey: (providerId: string) => Promise<{ success: boolean }>;

        /**
         * Checks if an API key is stored
         */
        isKeyStored: (providerId: string) => Promise<boolean>;

        /**
         * Gets all provider IDs with stored keys
         */
        getStoredProviderIds: () => Promise<string[]>;

        /**
         * Gets display information for an API key (status and last four chars)
         */
        getApiKeyDisplayInfo: (
          providerId: string
        ) => Promise<{ isStored: boolean; lastFourChars?: string }>;
      };
      llmService: {
        /**
         * Gets list of supported LLM providers
         */
        getProviders: () => Promise<Array<{ id: string; name: string }>>;

        /**
         * Gets list of supported models for a specific provider
         */
        getModels: (providerId: string) => Promise<
          Array<{
            id: string;
            name: string;
            providerId: string;
            contextWindow?: number;
            inputPrice?: number;
            outputPrice?: number;
            supportsSystemMessage?: boolean;
            description?: string;
            maxTokens?: number;
            supportsImages?: boolean;
            supportsPromptCache: boolean;
            thinkingConfig?: { maxBudget?: number; outputPrice?: number };
            cacheWritesPrice?: number;
            cacheReadsPrice?: number;
          }>
        >;

        /**
         * Sends a chat message to an LLM provider
         */
        sendMessage: (request: {
          providerId: string;
          modelId: string;
          messages: Array<{
            role: 'user' | 'assistant' | 'system';
            content: string;
          }>;
          systemMessage?: string;
          settings?: {
            temperature?: number;
            maxTokens?: number;
            topP?: number;
            stopSequences?: string[];
            frequencyPenalty?: number;
            presencePenalty?: number;
            user?: string;
            geminiSafetySettings?: Array<{
              category:
                | 'HARM_CATEGORY_UNSPECIFIED'
                | 'HARM_CATEGORY_HATE_SPEECH'
                | 'HARM_CATEGORY_SEXUALLY_EXPLICIT'
                | 'HARM_CATEGORY_DANGEROUS_CONTENT'
                | 'HARM_CATEGORY_HARASSMENT'
                | 'HARM_CATEGORY_CIVIC_INTEGRITY';
              threshold:
                | 'HARM_BLOCK_THRESHOLD_UNSPECIFIED'
                | 'BLOCK_LOW_AND_ABOVE'
                | 'BLOCK_MEDIUM_AND_ABOVE'
                | 'BLOCK_ONLY_HIGH'
                | 'BLOCK_NONE';
            }>;
          };
        }) => Promise<
          | {
              id: string;
              provider: string;
              model: string;
              created: number;
              choices: Array<{
                message: { role: string; content: string };
                finish_reason: string | null;
                index?: number;
              }>;
              usage?: {
                prompt_tokens?: number;
                completion_tokens?: number;
                total_tokens?: number;
              };
              object: 'chat.completion';
            }
          | {
              provider: string;
              model?: string;
              error: {
                message: string;
                code?: string | number;
                type?: string;
                param?: string;
                providerError?: any;
              };
              object: 'error';
            }
        >;
      };
      appShell: {
        /**
         * Opens an external URL in the default browser
         */
        openExternalURL: (url: string) => Promise<void>;

        /**
         * Opens a local path in the default file manager
         */
        openPath: (path: string) => Promise<void>;

        /**
         * Gets the global user custom prompts directory path
         */
        getGlobalPromptsPath: () => Promise<string>;

        /**
         * Gets the project-specific custom prompts directory path
         */
        getProjectPromptsPath: () => Promise<string>;
      };
      ui: {
        /**
         * Shows a native confirmation dialog and returns user's choice
         */
        confirm: (message: string, title?: string) => Promise<boolean>;
      };
    };

    // New path utilities API
    pathUtils: {
      /**
       * Convert path to Unix format (with forward slashes)
       */
      toUnix: (path: string) => Promise<string>;

      /**
       * Join two path segments
       */
      join: (path1: string, path2: string) => Promise<string>;

      /**
       * Get the base name (filename) from a path
       */
      basename: (path: string) => Promise<string>;

      /**
       * Convert path to platform-specific format
       */
      toOS: (path: string) => Promise<string>;

      /**
       * Get relative path from base directory
       */
      relative: (path: string) => Promise<string>;
    };

    // New file service API
    fileService: {
      // Path operations
      /**
       * Resolve a relative path to an absolute path
       */
      resolve: (relativePath: string) => Promise<string>;

      /**
       * Convert an absolute path to a project-relative path
       */
      relativize: (absolutePath: string) => Promise<string>;

      // Directory operations
      /**
       * Get the current base directory path
       */
      getCurrentDirectory: () => Promise<string>;

      /**
       * Check if a path is a directory
       */
      isDirectory: (path: string) => Promise<boolean>;

      /**
       * Read directory contents
       */
      readDirectory: (
        path: string,
        applyIgnores?: boolean
      ) => Promise<string[]>;

      /**
       * Ensure directory exists, creating it if needed
       */
      ensureDirectory: (path: string) => Promise<void>;

      // File operations
      /**
       * Check if a file exists
       */
      exists: (path: string) => Promise<boolean>;

      /**
       * Read file contents
       */
      read: (
        path: string,
        options?: { encoding?: BufferEncoding } | BufferEncoding
      ) => Promise<string | ArrayBuffer>;

      /**
       * Write data to a file
       */
      write: (path: string, data: string) => Promise<void>;

      /**
       * Delete a file
       */
      remove: (path: string) => Promise<void>;

      // Watcher operations
      /**
       * Watch a directory for changes
       */
      watch: (
        path: string,
        callback: (event: string, filename: string) => void
      ) => Promise<void>;

      /**
       * Clean up all active watchers
       */
      cleanupWatchers: () => Promise<void>;

      // Ignore operations
      /**
       * Reload ignore rules
       */
      reloadIgnoreRules: () => Promise<boolean>;

      /**
       * Add a path to ignore rules
       */
      addToIgnore: (itemPath: string, ignoreAll?: boolean) => Promise<boolean>;

      // Application paths
      /**
       * Get the materials directory path
       */
      getMaterialsDir: () => Promise<string>;

      /**
       * Get the resources directory path
       */
      getResourcesPath: () => Promise<string>;

      /**
       * Get path to a prompt template
       */
      getPromptTemplatePath: (templateName: string) => Promise<string>;

      // Base directory management
      /**
       * Sets the base directory for file operations in the main process
       */
      setBaseDirectory: (path: string) => Promise<void>;

      // Project operations
      /**
       * Open folder dialog and set as base directory
       */
      openFolder: () => Promise<string | null>;

      /**
       * Opens a dialog to select a project information file.
       * Returns a project-relative path or null if canceled.
       * Throws an error if selected file is outside project directory.
       */
      selectProjectInfoFile: () => Promise<string | null>;
    };

    // Settings service API
    settingsService: {
      /**
       * Get project settings from project_settings.json
       */
      getProjectSettings: (
        projectPath: string
      ) => Promise<ProjectSettings | null>;

      /**
       * Save project settings to project_settings.json
       */
      saveProjectSettings: (
        projectPath: string,
        settings: ProjectSettings
      ) => Promise<void>;

      /**
       * Get application settings from application_settings.json
       */
      getApplicationSettings: () => Promise<ApplicationSettings | null>;

      /**
       * Save application settings to application_settings.json
       */
      saveApplicationSettings: (settings: ApplicationSettings) => Promise<void>;
    };

    // Legacy file system API (maintained for backward compatibility)
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
  refreshFileSystem: (
    silentOrNewPath?: boolean | string,
    newlyCreatedPath?: string
  ) => Promise<void>;
  showProjectDialog: boolean;
  gitignoreExists: boolean;
  pendingDirectory: string | null;
  handleCreateProject: (
    useStandardIgnore: boolean,
    importGitignore: boolean
  ) => Promise<void>;
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
  project_info_path?: string; // Path to the file from which project_info was loaded
  system_prompt?: string;
  includeAiSummaries?: boolean;
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
