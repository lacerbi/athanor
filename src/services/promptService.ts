// AI Summary: Handles loading and parsing of prompt/task XML files from the resources directory.
// Uses shared parsing logic for both prompt_*.xml and task_*.xml with proper validation.
// Key functions: parseXmlFile() for XML parsing, loadPrompts()/loadTasks() for store updates.
// Maintains proper typing and ordering while integrating with promptStore/taskStore.
import { PromptData, PromptVariant, DEFAULT_PROMPT_ORDER } from '../types/promptTypes';
import { TaskData, TaskVariant, DEFAULT_TASK_ORDER } from '../types/taskTypes';
import { usePromptStore } from '../stores/promptStore';
import { useTaskStore } from '../stores/taskStore';
import { readFileContent } from './fileSystemService';
import { CUSTOM_TEMPLATES } from '../utils/constants';

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
  type: 'prompt' | 'task',
  source: 'default' | 'global' | 'project'
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
      source: source,
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
    // Initialize arrays for prompts from each source
    const defaultPromptsData: PromptData[] = [];
    const globalPromptsData: PromptData[] = [];
    const projectPromptsData: PromptData[] = [];

    // Load default prompts from resources
    const resourcesPath = await window.fileSystem.getResourcesPath();
    const promptsDir = await window.fileSystem.joinPaths(resourcesPath, 'prompts');
    const files = await window.fileSystem.readDirectory(promptsDir, false);

    // Parse default prompt files (starting with 'prompt_' and ending with '.xml')
    for (const file of files) {
      if (!file.startsWith('prompt_') || !file.endsWith('.xml')) {
        continue;
      }

      const filePath = await window.fileSystem.joinPaths(promptsDir, file);
      const promptData = await parseXmlFile<PromptData>(filePath, 'prompt', 'default');
      if (promptData) {
        defaultPromptsData.push(promptData);
      } else {
        console.log('Failed to parse default prompt:', file);
      }
    }

    // Load global user prompts
    try {
      const userDataPath = await window.app.getUserDataPath();
      const globalTemplatesDir = await window.fileSystem.joinPaths(userDataPath, CUSTOM_TEMPLATES.USER_PROMPTS_DIR_NAME);
      
      // Ensure global templates directory exists
      await window.fileService.ensureDirectory(globalTemplatesDir);
      
      const globalFiles = await window.fileSystem.readDirectory(globalTemplatesDir, false);
      console.log(`Global user templates directory: ${globalTemplatesDir}`);
      console.log(`Found ${globalFiles.length} files in global templates directory:`, globalFiles);

      // Parse global prompt files
      for (const file of globalFiles) {
        if (!file.startsWith('prompt_') || !file.endsWith('.xml')) {
          continue;
        }

        const filePath = await window.fileSystem.joinPaths(globalTemplatesDir, file);
        const promptData = await parseXmlFile<PromptData>(filePath, 'prompt', 'global');
        if (promptData) {
          globalPromptsData.push(promptData);
        } else {
          console.log('Failed to parse global prompt:', file);
        }
      }
    } catch (error) {
      console.warn('Error accessing global user templates directory:', error);
    }

    // Load project-specific prompts
    try {
      const materialsDir = await window.fileService.getMaterialsDir();
      const projectTemplatesDir = await window.fileSystem.joinPaths(materialsDir, CUSTOM_TEMPLATES.USER_PROMPTS_DIR_NAME);
      
      // Ensure project templates directory exists
      await window.fileService.ensureDirectory(projectTemplatesDir);
      
      const projectFiles = await window.fileSystem.readDirectory(projectTemplatesDir, false);
      console.log(`Project templates directory: ${projectTemplatesDir}`);
      console.log(`Found ${projectFiles.length} files in project templates directory:`, projectFiles);

      // Parse project prompt files
      for (const file of projectFiles) {
        if (!file.startsWith('prompt_') || !file.endsWith('.xml')) {
          continue;
        }

        const filePath = await window.fileSystem.joinPaths(projectTemplatesDir, file);
        const promptData = await parseXmlFile<PromptData>(filePath, 'prompt', 'project');
        if (promptData) {
          projectPromptsData.push(promptData);
        } else {
          console.log('Failed to parse project prompt:', file);
        }
      }
    } catch (error) {
      console.warn('Error accessing project templates directory:', error);
    }

    // Implement merging logic with override priority: Default < Global < Project
    // Templates are overridden by order (position), not by id
    const mergedPromptsMap = new Map<number, PromptData>();

    // Add default prompts first
    for (const prompt of defaultPromptsData) {
      mergedPromptsMap.set(prompt.order, prompt);
    }

    // Add global prompts (overrides defaults with same order)
    for (const prompt of globalPromptsData) {
      mergedPromptsMap.set(prompt.order, prompt);
    }

    // Add project prompts (overrides global and defaults with same order)
    for (const prompt of projectPromptsData) {
      mergedPromptsMap.set(prompt.order, prompt);
    }

    // Get final merged prompts list
    const finalMergedPrompts = Array.from(mergedPromptsMap.values());

    console.log(`Loaded ${defaultPromptsData.length} default prompts, ${globalPromptsData.length} global prompts, ${projectPromptsData.length} project prompts`);
    console.log(`Final merged prompts count: ${finalMergedPrompts.length}`);

    // Update store (sorting is handled internally by the store)
    usePromptStore.getState().setPrompts(finalMergedPrompts);
  } catch (error) {
    console.error('Error loading prompts:', error);
    throw error;
  }
}

// Load all tasks and update the store
export async function loadTasks(): Promise<void> {
  try {
    // Initialize arrays for tasks from each source
    const defaultTasksData: TaskData[] = [];
    const globalTasksData: TaskData[] = [];
    const projectTasksData: TaskData[] = [];

    // Load default tasks from resources
    const resourcesPath = await window.fileSystem.getResourcesPath();
    const promptsDir = await window.fileSystem.joinPaths(resourcesPath, 'prompts');
    const files = await window.fileSystem.readDirectory(promptsDir, false);

    // Parse default task files (starting with 'task_' and ending with '.xml')
    for (const file of files) {
      if (!file.startsWith('task_') || !file.endsWith('.xml')) {
        continue;
      }

      const filePath = await window.fileSystem.joinPaths(promptsDir, file);
      const taskData = await parseXmlFile<TaskData>(filePath, 'task', 'default');
      if (taskData) {
        defaultTasksData.push(taskData);
      } else {
        console.log('Failed to parse default task:', file);
      }
    }

    // Load global user tasks
    try {
      const userDataPath = await window.app.getUserDataPath();
      const globalTemplatesDir = await window.fileSystem.joinPaths(userDataPath, CUSTOM_TEMPLATES.USER_PROMPTS_DIR_NAME);
      
      // Ensure global templates directory exists
      await window.fileService.ensureDirectory(globalTemplatesDir);
      
      const globalFiles = await window.fileSystem.readDirectory(globalTemplatesDir, false);
      console.log(`Global user tasks directory: ${globalTemplatesDir}`);
      console.log(`Found ${globalFiles.length} files in global tasks directory:`, globalFiles);

      // Parse global task files
      for (const file of globalFiles) {
        if (!file.startsWith('task_') || !file.endsWith('.xml')) {
          continue;
        }

        const filePath = await window.fileSystem.joinPaths(globalTemplatesDir, file);
        const taskData = await parseXmlFile<TaskData>(filePath, 'task', 'global');
        if (taskData) {
          globalTasksData.push(taskData);
        } else {
          console.log('Failed to parse global task:', file);
        }
      }
    } catch (error) {
      console.warn('Error accessing global user tasks directory:', error);
    }

    // Load project-specific tasks
    try {
      const materialsDir = await window.fileService.getMaterialsDir();
      const projectTemplatesDir = await window.fileSystem.joinPaths(materialsDir, CUSTOM_TEMPLATES.USER_PROMPTS_DIR_NAME);
      
      // Ensure project templates directory exists
      await window.fileService.ensureDirectory(projectTemplatesDir);
      
      const projectFiles = await window.fileSystem.readDirectory(projectTemplatesDir, false);
      console.log(`Project tasks directory: ${projectTemplatesDir}`);
      console.log(`Found ${projectFiles.length} files in project tasks directory:`, projectFiles);

      // Parse project task files
      for (const file of projectFiles) {
        if (!file.startsWith('task_') || !file.endsWith('.xml')) {
          continue;
        }

        const filePath = await window.fileSystem.joinPaths(projectTemplatesDir, file);
        const taskData = await parseXmlFile<TaskData>(filePath, 'task', 'project');
        if (taskData) {
          projectTasksData.push(taskData);
        } else {
          console.log('Failed to parse project task:', file);
        }
      }
    } catch (error) {
      console.warn('Error accessing project tasks directory:', error);
    }

    // Implement merging logic with override priority: Default < Global < Project
    // Templates are overridden by order (position), not by id
    const mergedTasksMap = new Map<number, TaskData>();

    // Add default tasks first
    for (const task of defaultTasksData) {
      mergedTasksMap.set(task.order, task);
    }

    // Add global tasks (overrides defaults with same order)
    for (const task of globalTasksData) {
      mergedTasksMap.set(task.order, task);
    }

    // Add project tasks (overrides global and defaults with same order)
    for (const task of projectTasksData) {
      mergedTasksMap.set(task.order, task);
    }

    // Get final merged tasks list
    const finalMergedTasks = Array.from(mergedTasksMap.values());

    console.log(`Loaded ${defaultTasksData.length} default tasks, ${globalTasksData.length} global tasks, ${projectTasksData.length} project tasks`);
    console.log(`Final merged tasks count: ${finalMergedTasks.length}`);

    // Update store (sorting is handled internally by the store)
    useTaskStore.getState().setTasks(finalMergedTasks);
  } catch (error) {
    console.error('Error loading tasks:', error);
    throw error;
  }
}
