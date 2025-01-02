// AI Summary: Handles generation of refactoring prompts for code organization improvements.
// Manages template loading and task prompt generation with workbench store integration.
// Validates file selection and handles error states with proper cleanup.
import { FileItem } from '../utils/fileTree';
import { buildPrompt } from '../utils/buildPrompt';
import {
  loadTemplateContent,
  extractTaskDescription,
} from '../utils/promptTemplates';
import { useWorkbenchStore } from '../stores/workbenchStore';
import { FILE_SYSTEM } from '../utils/constants';
import { readFileByPath } from '../services/fileSystemService';

export async function buildRefactorPromptAction(params: {
  rootItems: FileItem[];
  selectedItems: Set<string>;
  setOutputContent: (content: string) => void;
  addLog: (message: string) => void;
  setIsLoading: (loading: boolean) => void;
}): Promise<void> {
  const { rootItems, selectedItems, setOutputContent, addLog, setIsLoading } =
    params;

  if (!rootItems.length) {
    console.warn('No file tree data available');
    return;
  }

  if (!selectedItems.size) {
    console.warn('No files selected');
    return;
  }

  setIsLoading(true);
  try {
    // Load and process task prompt
    const currentDir = await window.fileSystem.getCurrentDirectory();
    const taskPromptContent = await loadTemplateContent(
      'task_refactor_files.xml'
    );
    const taskDescription = extractTaskDescription(taskPromptContent);

    // Build prompt with selected files
    const processedTaskDescription = await buildPrompt(
      'task_refactor_files.xml',
      rootItems,
      selectedItems,
      currentDir,
      taskDescription
    );

    // Update task description in workbench
    const { setTaskDescription, triggerDeveloperAction } =
      useWorkbenchStore.getState();
    setTaskDescription(processedTaskDescription);

    addLog('Refactor task prompt loaded and processed');

    // Trigger Developer action
    triggerDeveloperAction();
  } catch (error) {
    console.error('Error processing Refactor task:', error);
    setOutputContent(
      'Error processing Refactor task. Check console for details.'
    );
    addLog('Failed to process Refactor task');
    // Ensure state is reset on error
    const { resetGeneratingPrompt } = useWorkbenchStore.getState();
    resetGeneratingPrompt();
  } finally {
    setIsLoading(false);
  }
}
