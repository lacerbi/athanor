// AI Summary: Loads and parses prompt and task XML files from resources directory.
// Handles both prompt_*.xml and task_*.xml with shared parsing logic and proper typing.
// Core functions: parseXmlFile(), parseAttributes(), loadPrompts(), loadTasks().
import { PromptData, PromptVariant, DEFAULT_PROMPT_ORDER } from '../types/promptTypes';
import { TaskData, TaskVariant, DEFAULT_TASK_ORDER } from '../types/taskTypes';
import { usePromptStore } from '../stores/promptStore';
import { useTaskStore } from '../stores/taskStore';
import { readFileContent } from './fileSystemService';

// Regular expressions for parsing XML files
const XML_TAG_REGEX = /<ath_(\w+)\s+([^>]+)>/;
const VARIANT_TAG_REGEX =
  /<ath_\w+_variant\s+([^>]+)>([\s\S]*?)<\/ath_\w+_variant>/g;
const ATTRIBUTES_REGEX = /(\w+)="([^"]*?)"/g;

// Parse attributes from an XML tag string
function parseAttributes(attributesStr: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  let match;
  while ((match = ATTRIBUTES_REGEX.exec(attributesStr)) !== null) {
    attributes[match[1]] = match[2];
  }
  return attributes;
}

// Generic function to parse both prompt and task files
async function parseXmlFile<T extends PromptData | TaskData>(
  filePath: string,
  type: 'prompt' | 'task'
): Promise<T | null> {
  try {
    const content = await readFileContent(filePath);

    // Parse main tag attributes
    const tagMatch = XML_TAG_REGEX.exec(content);
    if (!tagMatch || !tagMatch[2] || tagMatch[1] !== type) {
      console.warn(`No valid ath_${type} tag found in ${filePath}`);
      return null;
    }

    const attrs = parseAttributes(tagMatch[2]);
    if (!attrs.id || !attrs.label) {
      console.warn(`Missing required attributes (id/label) in ${filePath}`);
      return null;
    }

    // Parse order attribute with default fallback
    const order = attrs.order
      ? parseInt(attrs.order, 10)
      : type === 'prompt'
      ? DEFAULT_PROMPT_ORDER
      : DEFAULT_TASK_ORDER;

    // Validate order is a valid number
    if (isNaN(order)) {
      console.warn(`Invalid order value in ${filePath}, using default`);
    }

    // Parse variants
    const variants: (PromptVariant | TaskVariant)[] = [];
    let variantMatch;
    while ((variantMatch = VARIANT_TAG_REGEX.exec(content)) !== null) {
      const variantAttrs = parseAttributes(variantMatch[1]);
      if (!variantAttrs.id || !variantAttrs.label) continue;

      variants.push({
        id: variantAttrs.id,
        label: variantAttrs.label,
        tooltip: variantAttrs.tooltip,
        content: variantMatch[2].trim(),
      });
    }

    if (variants.length === 0) {
      console.warn(`No valid variants found in ${filePath}`);
      return null;
    }

    // Construct the data object
    const data: T = {
      id: attrs.id,
      label: attrs.label,
      icon: attrs.icon,
      tooltip: attrs.tooltip,
      order: order,
      variants: variants,
    } as T;

    // Add task-specific fields
    if (type === 'task' && attrs.requires) {
      (data as TaskData).requires = attrs.requires as 'selected';
    }

    return data;
  } catch (error) {
    console.error(`Error parsing ${type} file ${filePath}:`, error);
    return null;
  }
}

// Load all prompts and update the store
export async function loadPrompts(): Promise<void> {
  try {
    const resourcesPath = await window.fileSystem.getResourcesPath();
    const promptsDir = await window.fileSystem.joinPaths(resourcesPath, 'prompts');
    const files = await window.fileSystem.readDirectory(promptsDir, false);

    // Parse prompt files (starting with 'prompt_' and ending with '.xml')
    const prompts: PromptData[] = [];
    for (const file of files) {
      if (!file.startsWith('prompt_') || !file.endsWith('.xml')) {
        continue;
      }

      const filePath = await window.fileSystem.joinPaths(promptsDir, file);
      const promptData = await parseXmlFile<PromptData>(filePath, 'prompt');
      if (promptData) {
        prompts.push(promptData);
      } else {
        console.log('Failed to parse prompt:', file);
      }
    }

    // Update store
    usePromptStore.getState().setPrompts(prompts);
  } catch (error) {
    console.error('Error loading prompts:', error);
    throw error;
  }
}

// Load all tasks and update the store
export async function loadTasks(): Promise<void> {
  try {
    const resourcesPath = await window.fileSystem.getResourcesPath();
    const promptsDir = await window.fileSystem.joinPaths(resourcesPath, 'prompts');
    const files = await window.fileSystem.readDirectory(promptsDir, false);

    // Parse task files (starting with 'task_' and ending with '.xml')
    const tasks: TaskData[] = [];
    for (const file of files) {
      if (!file.startsWith('task_') || !file.endsWith('.xml')) {
        continue;
      }

      const filePath = await window.fileSystem.joinPaths(promptsDir, file);
      const taskData = await parseXmlFile<TaskData>(filePath, 'task');
      if (taskData) {
        tasks.push(taskData);
      } else {
        console.log('Failed to parse task:', file);
      }
    }

    // Update store
    useTaskStore.getState().setTasks(tasks);
  } catch (error) {
    console.error('Error loading tasks:', error);
    throw error;
  }
}
