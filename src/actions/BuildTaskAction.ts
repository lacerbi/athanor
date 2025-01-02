// AI Summary: Builds task-specific prompts for AI coding assistance using develop prompt template.
// Handles content normalization and clipboard operations with token counting.
// Integrates with workbench store for task description and prompt generation state.
import { FileItem } from '../utils/fileTree';
import { buildDevelopPrompt } from '../utils/buildPrompt';
import { countTokens, formatTokenCount } from '../utils/tokenCount';
import { useWorkbenchStore } from '../stores/workbenchStore';

// Normalize line endings while preserving other whitespace
function normalizeContent(content: string): string {
  if (!content) return '';
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export async function buildTaskPrompt(params: {
  rootItems: FileItem[];
  selectedItems: Set<string>;
  taskDescription: string;
  setOutputContent: (content: string) => void;
  addLog: (message: string) => void;
  setIsLoading: (loading: boolean) => void;
}): Promise<void> {
  const {
    rootItems,
    selectedItems,
    taskDescription,
    setOutputContent,
    addLog,
    setIsLoading,
  } = params;

  if (!rootItems.length) {
    console.warn('No file tree data available');
    return;
  }

  setIsLoading(true);
  try {
    const currentDir = await window.fileSystem.getCurrentDirectory();
    const docString = await buildDevelopPrompt(
      rootItems,
      selectedItems,
      currentDir,
      taskDescription
    );

    const normalizedContent = normalizeContent(docString);
    setOutputContent(normalizedContent);
    await navigator.clipboard.writeText(normalizedContent);
    addLog(
      `Develop prompt built and copied to clipboard (${formatTokenCount(countTokens(normalizedContent))})`
    );
  } catch (error) {
    console.error('Error building Develop prompt:', error);
    setOutputContent(
      'Error building Develop prompt. Check console for details.'
    );
    addLog('Failed to build Develop prompt');
  } finally {
    setIsLoading(false);
    // Reset the generating prompt flag after completion
    const { resetGeneratingPrompt } = useWorkbenchStore.getState();
    resetGeneratingPrompt();
  }
}
