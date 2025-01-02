// AI Summary: Builds prompts for AI to identify relevant files in the codebase based on task description.
// Manages file tree traversal and selection state with integration to workbench store.
// Handles content normalization and clipboard integration with token counting.
import { FileItem } from '../utils/fileTree';
import { buildAutoselectPrompt } from '../utils/buildPrompt';
import { countTokens, formatTokenCount } from '../utils/tokenCount';

// Normalize line endings while preserving other whitespace
function normalizeContent(content: string): string {
  if (!content) return '';
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export async function autoSelectFiles(params: {
  rootItems: FileItem[];
  selectedItems: Set<string>;
  taskDescription: string;
  setOutputContent: (content: string) => void;
  addLog: (message: string) => void;
  setIsLoading: (loading: boolean) => void;
  clearSelections: () => void;
  getSelectedItems: () => Set<string>;
}): Promise<void> {
  const {
    rootItems,
    selectedItems,
    taskDescription,
    setOutputContent,
    addLog,
    setIsLoading,
    clearSelections,
    getSelectedItems,
  } = params;

  if (!rootItems.length) {
    console.warn('No file tree data available');
    return;
  }

  setIsLoading(true);
  try {
    clearSelections();
    const currentSelections = getSelectedItems();

    const currentDir = await window.fileSystem.getCurrentDirectory();
    const docString = await buildAutoselectPrompt(
      rootItems,
      currentSelections,
      currentDir,
      taskDescription
    );

    const normalizedContent = normalizeContent(docString);
    setOutputContent(normalizedContent);
    await navigator.clipboard.writeText(normalizedContent);
    addLog(
      `Autoselect prompt built and copied to clipboard (${formatTokenCount(countTokens(normalizedContent))})`
    );
  } catch (error) {
    console.error('Error building Autoselect prompt:', error);
    setOutputContent(
      'Error building Autoselect prompt. Check console for details.'
    );
    addLog('Failed to build Autoselect prompt');
  } finally {
    setIsLoading(false);
  }
}
