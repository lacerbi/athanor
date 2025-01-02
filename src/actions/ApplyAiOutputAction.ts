// AI Summary: Parses and applies AI output from clipboard content, handling multiple command types including file operations.
// Processes SELECT, TASK, and APPLY CHANGES commands with proper state management and error handling.
// Integrates with workbench and file system stores for selection tracking and change application.
import { parseCommand, Command } from '../utils/commandParser';
import { FileOperation } from '../types/global';
import { parseXmlContent } from '../services/xmlParsingService';
import { countTokens, formatTokenCount } from '../utils/tokenCount';
import { useFileSystemStore } from '../stores/fileSystemStore';
import { useWorkbenchStore } from '../stores/workbenchStore';
import {
  processFileUpdate,
  normalizeLineEndings,
} from '../utils/fileOperations';

async function executeCommand(
  command: Command,
  addLog: (message: string) => void
): Promise<boolean> {
  const fileSystemStore = useFileSystemStore.getState();

  switch (command.type) {
    case 'select':
      // Clear existing selections
      fileSystemStore.clearSelections();

      // Split content on whitespace to get file paths
      const filePaths = command.content
        .trim()
        .split(/\s+/)
        .map((path) => '/' + path);

      // Select all specified files
      fileSystemStore.selectItems(filePaths);

      // Log success message with all selected files
      addLog(
        `Selected ${filePaths.length} files based on command: ${filePaths.join(
          ' '
        )}`
      );
      return true;

    default:
      if (command.type === 'task') {
        const workbenchStore = useWorkbenchStore.getState();
        const taskContent = command.content.trim();

        if (!taskContent) {
          addLog('Task command contains no content');
          return false;
        }

        workbenchStore.resetTaskDescription(taskContent);
        addLog('Updated task description from command');
        return true;
      }

      addLog(`Unknown command type: ${command.type}`);
      return false;
  }
}

export async function applyAiOutput(params: {
  addLog: (message: string) => void;
  setOperations: (ops: FileOperation[]) => void;
  clearOperations: () => void;
  setActiveTab?: (tab: 'workbench' | 'viewer' | 'apply-changes') => void;
}): Promise<void> {
  const { addLog, setOperations, clearOperations, setActiveTab } = params;

  try {
    const clipboardContent = await navigator.clipboard.readText();
    const commands = parseCommand(clipboardContent);

    if (!commands) {
      addLog('No valid commands found in clipboard');
      return;
    }

    // Process all commands sequentially
    for (const command of commands) {
      if (command.type === 'apply changes') {
        addLog(
          `Processing apply changes command (${formatTokenCount(
            countTokens(command.fullContent || command.content)
          )})`
        );
        try {
          const operations = await parseXmlContent(
            command.fullContent || command.content,
            addLog
          );
          if (operations.length) {
            clearOperations();
            setOperations(operations);
            if (setActiveTab) {
              setActiveTab('apply-changes');
            }
            addLog(`Found ${operations.length} file operations`);
          } else {
            addLog('No valid file operations found in command');
          }
        } catch (error) {
          console.error('Error processing XML content:', error);
          addLog(
            error instanceof Error
              ? error.message
              : 'Failed to process XML content'
          );
        }
      } else {
        const success = await executeCommand(command, addLog);
        if (!success) {
          addLog(`Failed to execute ${command.type} command`);
        }
      }
    }
  } catch (err) {
    console.error('Failed to read clipboard:', err);
    addLog('Failed to read clipboard content');
  }
}
