// AI Summary: Orchestrates command execution from clipboard content using dedicated command handlers.
// Processes SELECT, TASK, and APPLY CHANGES commands through modular command system.
import { parseCommand } from '../utils/commandParser';
import { FileOperation } from '../types/global';
import {
  COMMAND_TYPES,
  executeSelectCommand,
  executeTaskCommand,
  executeApplyChangesCommand,
} from '../commands';

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
      let success = false;

      switch (command.type) {
        case COMMAND_TYPES.SELECT:
          success = await executeSelectCommand({
            content: command.content,
            addLog,
          });
          break;

        case COMMAND_TYPES.TASK:
          success = await executeTaskCommand({
            content: command.content,
            addLog,
          });
          break;

        case COMMAND_TYPES.APPLY_CHANGES:
          success = await executeApplyChangesCommand({
            content: command.content,
            fullContent: command.fullContent,
            addLog,
            setOperations,
            clearOperations,
            setActiveTab,
          });
          break;

        default:
          addLog(`Unknown command type: ${command.type}`);
          continue;
      }

      if (!success) {
        addLog(`Failed to execute ${command.type} command`);
      }
    }
  } catch (err) {
    console.error('Failed to read clipboard:', err);
    addLog('Failed to read clipboard content');
  }
}
