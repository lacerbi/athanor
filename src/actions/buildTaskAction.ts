// AI Summary: Generic task builder that handles any task type using dynamic prompts.
// Uses task data from taskStore to generate prompts with proper template loading.
// Integrates with workbench store for task description and context management.
import { FileItem } from '../utils/fileTree';
import { buildDynamicPrompt } from '../utils/buildPrompt';
import { TaskData } from '../types/taskTypes';
import { useWorkbenchStore } from '../stores/workbenchStore';

export interface BuildTaskActionParams {
  task: TaskData;
  rootItems: FileItem[];
  selectedItems: Set<string>;
  setOutputContent: (content: string) => void;
  addLog: (message: string) => void;
  setIsLoading: (loading: boolean) => void;
  currentThresholdLineLength: number;
}

export async function buildTaskAction(params: BuildTaskActionParams): Promise<void> {
  const {
    task,
    rootItems,
    selectedItems,
    setOutputContent,
    addLog,
    setIsLoading,
    currentThresholdLineLength,
  } = params;

  if (!rootItems.length) {
    console.warn('No file tree data available');
    return;
  }

  // Check if task requires file selection
  if (task.requires === 'selected' && !selectedItems.size) {
    console.warn('No files selected');
    return;
  }

  // Get workbench store methods for state management
  const { setIsGeneratingPrompt, resetGeneratingPrompt, setTaskDescription } = useWorkbenchStore.getState();

  setIsLoading(true);
  setIsGeneratingPrompt(true); // Set global loading state
  try {
    // Get current directory for path resolution
    const currentDir = await window.fileSystem.getCurrentDirectory();

    // Get the default variant from task
    const defaultVariant = task.variants[0];
    if (!defaultVariant) {
      throw new Error(`No variant found for task ${task.id}`);
    }

    // Build prompt with task content
    const processedTaskDescription = await buildDynamicPrompt(
      task,
      defaultVariant,
      rootItems,
      Array.from(selectedItems), // Convert Set to array for buildDynamicPrompt
      currentDir,
      useWorkbenchStore.getState().taskDescription,
      useWorkbenchStore.getState().taskContext,
      undefined, // passedFormatTypeOverride
      undefined, // smartPreviewConfigInput
      currentThresholdLineLength
    );

    // Update task description in workbench
    setTaskDescription(processedTaskDescription);
    addLog(`${task.label} task prompt loaded and processed`);

    // No longer triggering developer action automatically from here
  } catch (error) {
    console.error(`Error processing ${task.label} task:`, error);
    setOutputContent(
      `Error processing ${task.label} task. Check console for details.`
    );
    addLog(`Failed to process ${task.label} task`);
    // Ensure state is reset on error
    resetGeneratingPrompt();
  } finally {
    setIsLoading(false);
    setIsGeneratingPrompt(false); // Reset global loading state
  }
}
