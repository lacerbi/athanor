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

// Get list of selected files with relative paths and line counts
function getSelectedFilesWithInfo(
  items: FileItem[],
  selectedItems: Set<string>,
  rootPath: string
): string {
  const selectedFiles: string[] = [];

  function traverse(item: FileItem) {
    if (item.type === 'file' && selectedItems.has(item.id)) {
      // Use item.id which is already relative path, just remove leading slash
      const relativePath = item.id.replace(/^\//, '');
      const lineCount = item.lineCount || '?';
      selectedFiles.push(`${relativePath} (${lineCount} lines)`);
    }
    item.children?.forEach(traverse);
  }

  items.forEach(traverse);
  return selectedFiles.sort().join('\n');
}

// Get list of selected files with relative paths only
function getSelectedFilesList(
  items: FileItem[],
  selectedItems: Set<string>,
  rootPath: string
): string {
  const selectedFiles: string[] = [];

  function traverse(item: FileItem) {
    if (item.type === 'file' && selectedItems.has(item.id)) {
      // Use item.id which is already relative path, just remove leading slash
      const relativePath = item.id.replace(/^\//, '');
      selectedFiles.push(relativePath);
    }
    item.children?.forEach(traverse);
  }

  items.forEach(traverse);
  return selectedFiles.sort().join('\n');
}

// Check if any files are selected in the tree
function hasSelectedFiles(
  items: FileItem[],
  selectedItems: Set<string>
): boolean {
  for (const item of items) {
    if (item.type === 'file' && selectedItems.has(item.id)) {
      return true;
    }
    if (item.children && hasSelectedFiles(item.children, selectedItems)) {
      return true;
    }
  }
  return false;
}

// Build a dynamic prompt using prompt data and variant
export async function buildDynamicPrompt(
  prompt: PromptData,
  variant: PromptVariant,
  items: FileItem[],
  selectedItems: Set<string>,
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

  // Generate codebase documentation
  const codebaseDoc = await generateCodebaseDocumentation(
    items,
    selectedItems,
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
    selected_files: getSelectedFilesList(items, selectedItems, rootPath),
    selected_files_with_info: getSelectedFilesWithInfo(
      items,
      selectedItems,
      rootPath
    ),
    codebase_legend: hasSelectedFiles(items, selectedItems)
      ? '## Legend\n\n* = likely relevant file or folder for the current task'
      : '',
    threshold_line_length: activeThresholdLineLength,
    include_ai_summaries: includeAiSummaries,
    ...codebaseContent, // Contains file_contents and modified file_tree
  };

  // Use the variant content directly
  return substituteVariables(variant.content, variables);
}
