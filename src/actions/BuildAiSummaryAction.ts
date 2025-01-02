// AI Summary: Handles generation of AI summaries using task prompts with template-based workflow.
// Manages file selection validation, task prompt loading, and developer action triggering.
// Integrates with workbench store for task description and prompt generation state.
import { FileItem } from '../utils/fileTree';
import { buildPrompt } from '../utils/buildPrompt';
import {
  loadTemplateContent,
  extractTaskDescription,
} from '../utils/promptTemplates';
import { countTokens, formatTokenCount } from '../utils/tokenCount';
import { useWorkbenchStore } from '../stores/workbenchStore';

function normalizeContent(content: string): string {
  if (!content) return '';
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export async function buildAiSummaryPromptAction(params: {
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
    const taskPromptContent = await loadTemplateContent('task_ai_summary.xml');
    const taskDescription = extractTaskDescription(taskPromptContent);

    // Build prompt with selected files
    const processedTaskDescription = await buildPrompt(
      'task_ai_summary.xml',
      rootItems,
      selectedItems,
      currentDir,
      taskDescription
    );

    // Update task description in workbench
    const { setTaskDescription, triggerDeveloperAction } =
      useWorkbenchStore.getState();
    setTaskDescription(processedTaskDescription);

    addLog('Summarize task prompt loaded and processed');

    // Trigger Developer action
    triggerDeveloperAction();
  } catch (error) {
    console.error('Error processing Summarize task:', error);
    setOutputContent(
      'Error processing Summarize task. Check console for details.'
    );
    addLog('Failed to process Summarize task');
    // Ensure state is reset on error
    const { resetGeneratingPrompt } = useWorkbenchStore.getState();
    resetGeneratingPrompt();
  } finally {
    setIsLoading(false);
  }
}
