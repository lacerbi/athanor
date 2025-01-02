// AI Summary: Builds specialized prompts for software engineering tasks including code analysis and architecture discussions.
// Generates context-aware prompts with file selection and task description integration.
// Handles content normalization and clipboard operations with token counting.
import { FileItem } from '../utils/fileTree';
import { buildSoftwareEngineerPrompt } from '../utils/buildPrompt';
import { countTokens, formatTokenCount } from '../utils/tokenCount';

function normalizeContent(content: string): string {
  return !content ? '' : content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export async function buildSoftwareEngineerPromptAction(params: {
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
    const docString = await buildSoftwareEngineerPrompt(
      rootItems,
      selectedItems,
      currentDir,
      taskDescription
    );
    const normalizedContent = normalizeContent(docString);
    setOutputContent(normalizedContent);
    await navigator.clipboard.writeText(normalizedContent);
    addLog(
      `Analyze prompt built and copied to clipboard (${formatTokenCount(
        countTokens(normalizedContent)
      )})`
    );
  } catch (error) {
    console.error('Error building Analyze prompt:', error);
    setOutputContent(
      'Error building Analyze prompt. Check console for details.'
    );
    addLog('Failed to build Analyze prompt');
  } finally {
    setIsLoading(false);
  }
}
