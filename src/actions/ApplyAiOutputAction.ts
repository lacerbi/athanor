// AI Summary: Orchestrates command execution from AI content using dedicated command handlers.
// Processes SELECT, TASK, and APPLY CHANGES commands through modular command system.
import type { FileOperation } from '../types/global';
import * as commands from '../commands';
import { useApplyChangesStore } from '../stores/applyChangesStore';

/**
 * Process AI response content for commands, independent of clipboard
 *
 * @param aiContent - The AI response content to process
 * @param params - Parameters for command execution
 */
export async function processAiResponseContent(
  aiContent: string,
  params: {
    addLog: (
      message: string | { message: string; onClick: () => Promise<void> }
    ) => void;
    setOperations: (ops: FileOperation[]) => void;
    clearOperations: () => void;
    setActiveTab?: (tab: 'workbench' | 'viewer' | 'apply-changes') => void;
  }
): Promise<void> {
  const { addLog, setOperations, clearOperations, setActiveTab } = params;

  try {
    const parsedCommands = commands.parseCommand(aiContent);

    if (!parsedCommands || parsedCommands.length === 0) {
      addLog('No valid commands found in AI response');
      return;
    }

    // Process all commands sequentially
    for (const command of parsedCommands) {
      let success = false;

      switch (command.type) {
        case commands.COMMAND_TYPES.SELECT:
          success = await commands.executeSelectCommand({
            content: command.content,
            addLog,
          });
          break;

        case commands.COMMAND_TYPES.TASK:
          success = await commands.executeTaskCommand({
            content: command.content,
            addLog,
          });
          break;

        case commands.COMMAND_TYPES.APPLY_CHANGES:
          // Get current diff mode from store
          const { diffMode } = useApplyChangesStore.getState();
          success = await commands.executeApplyChangesCommand({
            content: command.content,
            fullContent: command.fullContent,
            addLog,
            setOperations,
            clearOperations,
            setActiveTab,
            diffMode,
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
    console.error('Failed to process AI content:', err);
    addLog(
      `Failed to process AI content: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Apply AI output from clipboard (legacy function)
 */
export async function applyAiOutput(params: {
  addLog: (
    message: string | { message: string; onClick: () => Promise<void> }
  ) => void;
  setOperations: (ops: FileOperation[]) => void;
  clearOperations: () => void;
  setActiveTab?: (tab: 'workbench' | 'viewer' | 'apply-changes') => void;
}): Promise<void> {
  const { addLog } = params;

  try {
    const clipboardContent = await navigator.clipboard.readText();
    await processAiResponseContent(clipboardContent, params);
  } catch (err) {
    console.error('Failed to read clipboard:', err);
    addLog('Failed to read clipboard content');
  }
}
