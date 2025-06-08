// AI Summary: Builds AI prompts dynamically by loading templates, substituting variables (project info, file contents, selected files, task details), and applying user configuration settings.
// Handles codebase documentation generation, selected file list formatting, and applies settings like smart preview and file tree inclusion from the fileSystemStore.
// Core function: buildDynamicPrompt.
import { FileItem } from './fileTree';
import { generateCodebaseDocumentation } from './codebaseDocumentation';
import { DOC_FORMAT, FILE_SYSTEM, SETTINGS } from './constants';
import {
  loadTemplateContent,
  substituteVariables,
  extractTaskDescription,
} from './promptTemplates';
import { PromptData, PromptVariant } from '../types/promptTypes';
import { useFileSystemStore } from '../stores/fileSystemStore';
import { AthanorConfig } from '../types/global';

export interface PromptVariables {
  project_name?: string;
  project_info?: string;
  file_contents?: string;
  file_tree?: string;
  task_description?: string;
  codebase_legend?: string;
  selected_files?: string;
  selected_files_with_info?: string;
  task_context?: string;
  threshold_line_length?: number;
  include_ai_summaries?: boolean;
}

// Get list of selected files with relative paths and line counts, preserving order
function getSelectedFilesWithInfo(
  items: FileItem[],
  selectedFiles: string[],
  rootPath: string
): string {
  const filesWithInfo: string[] = [];

  // Create a map for quick file lookup
  const fileMap = new Map<string, FileItem>();
  function buildFileMap(item: FileItem) {
    if (item.type === 'file') {
      fileMap.set(item.id, item);
    }
    item.children?.forEach(buildFileMap);
  }
  items.forEach(buildFileMap);

  // Process selected files in order
  selectedFiles.forEach(fileId => {
    const item = fileMap.get(fileId);
    if (item) {
      // Use item.id which is already relative path, just remove leading slash
      const relativePath = item.id.replace(/^\//, '');
      const lineCount = item.lineCount || '?';
      filesWithInfo.push(`${relativePath} (${lineCount} lines)`);
    }
  });

  return filesWithInfo.join('\n');
}

// Get list of selected files with relative paths only, preserving order
function getSelectedFilesList(
  items: FileItem[],
  selectedFiles: string[],
  rootPath: string
): string {
  const filesList: string[] = [];

  // Process selected files in order, just clean up the paths
  selectedFiles.forEach(fileId => {
    // Use fileId which is already relative path, just remove leading slash
    const relativePath = fileId.replace(/^\//, '');
    filesList.push(relativePath);
  });

  return filesList.join('\n');
}

// Check if any files are selected
function hasSelectedFiles(selectedFiles: string[]): boolean {
  return selectedFiles.length > 0;
}

// Build a dynamic prompt using prompt data and variant
export async function buildDynamicPrompt(
  prompt: PromptData,
  variant: PromptVariant,
  items: FileItem[],
  selectedFiles: string[], // Changed from Set<string> to string[] to preserve order
  rootPath: string,
  taskDescription: string = '',
  taskContext: string = '',
  passedFormatTypeOverride?: string,
  smartPreviewConfigInput?: { minLines: number; maxLines: number },
  currentThresholdLineLength?: number // Added new parameter
): Promise<string> {
  // Get the store settings and effective configuration
  const {
    smartPreviewEnabled,
    includeFileTree,
    formatType: storeFormatType,
    includeProjectInfo,
    effectiveConfig,
  } = useFileSystemStore.getState();

  // Handle smartPreviewConfig with centralized defaults and warning
  let smartPreviewConfig = smartPreviewConfigInput;
  if (!smartPreviewConfig) {
    console.warn(
      'AthanorApp: buildDynamicPrompt did not receive smartPreviewConfig. Using default values from constants.ts.'
    );
    smartPreviewConfig = {
      minLines: SETTINGS.defaults.application.minSmartPreviewLines,
      maxLines: SETTINGS.defaults.application.maxSmartPreviewLines,
    };
  }

  // Determine the actual format type to use for documentation
  const actualFormatType =
    passedFormatTypeOverride || storeFormatType || DOC_FORMAT.DEFAULT;

  // Determine the active threshold line length to use
  const activeThresholdLineLength =
    currentThresholdLineLength ??
    SETTINGS.defaults.application.thresholdLineLength;

  // Use effective config from store, with fallback for safety
  let config: AthanorConfig;
  if (effectiveConfig) {
    config = effectiveConfig;
  } else {
    console.warn('No effective configuration available, using fallback');
    // Import readAthanorConfig dynamically only when needed as fallback
    const { readAthanorConfig } = await import('./configUtils');
    config = await readAthanorConfig(rootPath);
  }

  // Determine the includeAiSummaries setting, using true as default
  const includeAiSummaries = config.includeAiSummaries ?? true;

  // Prepare project info with source file path if available
  let projectInfoForPrompt = '';
  if (includeProjectInfo && config.project_info && config.project_info.trim()) {
    if (config.project_info_path) {
      // Convert absolute path to project-relative path
      const relativePath = config.project_info_path
        .replace(rootPath, '')
        .replace(/^[/\\]/, '');
      // If project_info came from a file, add header with relative file path
      projectInfoForPrompt = `# Project info from: ${relativePath}\n\n${config.project_info}`;
    } else {
      // Use project_info as is (already wrapped in tags)
      projectInfoForPrompt = config.project_info;
    }
  }

  // Convert selectedFiles array to Set for generateCodebaseDocumentation compatibility
  const selectedItemsSet = new Set(selectedFiles);

  // Generate codebase documentation
  const codebaseDoc = await generateCodebaseDocumentation(
    items,
    selectedItemsSet,
    rootPath,
    config,
    smartPreviewEnabled,
    actualFormatType, // Use the derived actualFormatType
    config.project_info_path, // Pass project_info_path to avoid duplication
    smartPreviewConfig,
    activeThresholdLineLength // Pass the active threshold
  );

  // Format task context if non-empty
  const formattedTaskContext = taskContext?.trim()
    ? `\n<task_context>\n${taskContext.trim()}\n</task_context>`
    : '';

  // Create a copy of codebaseDoc to avoid modifying the original
  const codebaseContent = { ...codebaseDoc };

  // If file tree is disabled, set it to empty string
  if (!includeFileTree) {
    codebaseContent.file_tree = '';
  }

  // Prepare variables for template
  const variables: PromptVariables = {
    project_name: config.project_name,
    project_info: projectInfoForPrompt,
    task_description: taskDescription,
    task_context: formattedTaskContext,
    selected_files: getSelectedFilesList(items, selectedFiles, rootPath),
    selected_files_with_info: getSelectedFilesWithInfo(
      items,
      selectedFiles,
      rootPath
    ),
    codebase_legend: hasSelectedFiles(selectedFiles)
      ? '## Legend\n\n* = likely relevant file or folder for the current task'
      : '',
    threshold_line_length: activeThresholdLineLength,
    include_ai_summaries: includeAiSummaries,
    ...codebaseContent, // Contains file_contents and modified file_tree
  };

  // Use the variant content directly
  return substituteVariables(variant.content, variables);
}
