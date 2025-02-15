// AI Summary: Processes apply changes commands by parsing XML content and preparing file operations.
// Handles both full file updates and diff-based changes with proper error handling.
import { FileOperation } from '../types/global';
import { parseXmlContent } from './parser/applyChangesParser';
import { countTokens, formatTokenCount } from '../utils/tokenCount';

export interface ApplyChangesParams {
  content: string;
  fullContent?: string;
  addLog: (message: string | { message: string; onClick: () => Promise<void> }) => void;
  setOperations: (ops: FileOperation[]) => void;
  clearOperations: () => void;
  setActiveTab?: (tab: 'workbench' | 'viewer' | 'apply-changes') => void;
}

export async function executeApplyChangesCommand({
  content,
  fullContent,
  addLog,
  setOperations,
  clearOperations,
  setActiveTab,
}: ApplyChangesParams): Promise<boolean> {
  addLog(
    `Processing apply changes command (${formatTokenCount(
      countTokens(fullContent || content)
    )})`
  );

  try {
    const operations = await parseXmlContent(fullContent || content, 
      // Pass addLog directly since it now supports both string and object with onClick
      addLog
    );
    if (operations.length) {
      clearOperations();
      setOperations(operations);
      if (setActiveTab) {
        setActiveTab('apply-changes');
      }
      addLog(`Found ${operations.length} file operations`);
      return true;
    } else {
      addLog('No valid file operations found in command');
      return false;
    }
  } catch (error) {
    console.error('Error processing XML content:', error);
    addLog(
      error instanceof Error ? error.message : 'Failed to process XML content'
    );
    return false;
  }
}
