// AI Summary: Main prompt builder that loads templates and assembles prompts with variable substitution.
// Handles missing config values with fallbacks and dynamic legend generation.
// Provides specialized builders for autoselect, develop, and software engineer prompts.
import { FileItem } from './fileTree';
import { readAthanorConfig } from './configUtils';
import { generateCodebaseDocumentation } from './codebaseDocumentation';
import {
  loadTemplateContent,
  substituteVariables,
  extractTaskDescription,
} from './promptTemplates';

export interface PromptVariables {
  project_name?: string;
  project_info?: string;
  file_contents?: string;
  file_tree?: string;
  task_description?: string;
  codebase_legend?: string;
  selected_files?: string;
  selected_files_with_info?: string;
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

// Build a prompt using a template and provided variables
export async function buildPrompt(
  templateName: string,
  items: FileItem[],
  selectedItems: Set<string>,
  rootPath: string,
  taskDescription: string = ''
): Promise<string> {
  // Load config with fallback values
  const config = await readAthanorConfig(rootPath);

  // Generate codebase documentation
  const codebaseDoc = await generateCodebaseDocumentation(
    items,
    selectedItems,
    rootPath,
    config
  );

  // Prepare variables for template
  const variables: PromptVariables = {
    project_name: config.project_name,
    project_info: config.project_info,
    task_description: taskDescription,
    selected_files: getSelectedFilesList(items, selectedItems, rootPath),
    selected_files_with_info: getSelectedFilesWithInfo(items, selectedItems, rootPath),
    codebase_legend: hasSelectedFiles(items, selectedItems)
      ? '\n## Legend\n\n* = likely relevant file or folder for the current task\n'
      : '',
    ...codebaseDoc, // Contains file_contents and file_tree
  };

  // Load and process template
  const templateContent = await loadTemplateContent(templateName);
  return substituteVariables(templateContent, variables);
}

// Specialized builders for specific prompt types
export async function buildAutoselectPrompt(
  items: FileItem[],
  selectedItems: Set<string>,
  rootPath: string,
  taskDescription: string
): Promise<string> {
  return buildPrompt(
    'autoselect.xml',
    items,
    selectedItems,
    rootPath,
    taskDescription
  );
}

export async function buildDevelopPrompt(
  items: FileItem[],
  selectedItems: Set<string>,
  rootPath: string,
  taskDescription: string
): Promise<string> {
  return buildPrompt(
    'develop.xml',
    items,
    selectedItems,
    rootPath,
    taskDescription
  );
}

export async function buildSoftwareEngineerPrompt(
  items: FileItem[],
  selectedItems: Set<string>,
  rootPath: string,
  taskDescription: string
): Promise<string> {
  return buildPrompt(
    'software_engineer.xml',
    items,
    selectedItems,
    rootPath,
    taskDescription
  );
}
