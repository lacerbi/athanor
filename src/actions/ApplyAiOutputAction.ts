// AI Summary: Orchestrates command execution from AI content using dedicated command handlers.
// Processes SELECT, TASK, and APPLY CHANGES commands through a modular command system, aggregating multiple 'apply changes' blocks.
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
    setActiveTab?: (tab: 'workbench' | 'viewer' | 'review') => void;
  }
): Promise<void> {
  const { addLog, setOperations, clearOperations, setActiveTab } = params;

  try {
    const parsedCommands = commands.parseCommand(aiContent);

    if (!parsedCommands || parsedCommands.length === 0) {
      addLog('No valid commands found in AI response');
      return;
    }

    // Filter commands to separate 'apply changes' from others
    const applyChangesCommands = parsedCommands.filter(
      (cmd) => cmd.type === commands.COMMAND_TYPES.APPLY_CHANGES
    );
    const otherCommands = parsedCommands.filter(
      (cmd) => cmd.type !== commands.COMMAND_TYPES.APPLY_CHANGES
    );

    // Aggregate and process all 'apply changes' commands as a single operation
    if (applyChangesCommands.length > 0) {
      const combinedContent = applyChangesCommands
        .map((cmd) => cmd.content)
        .join('\n');
      const combinedFullContent = `<ath command="apply changes">${combinedContent}</ath>`;

      const { diffMode } = useApplyChangesStore.getState();
      const success = await commands.executeApplyChangesCommand({
        content: combinedContent,
        fullContent: combinedFullContent,
        addLog,
        setOperations,
        clearOperations,
        setActiveTab,
        diffMode,
      });

      if (!success) {
        addLog('Failed to execute combined APPLY_CHANGES command');
      }
    }

    // Process all other commands sequentially
    for (const command of otherCommands) {
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

        case commands.COMMAND_TYPES.AGENT_TASK:
          success = await commands.executeAgentTaskCommand({
            content: command.content,
            addLog,
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
      `Failed to process AI content: ${
        err instanceof Error ? err.message : String(err)
      }`
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
  setActiveTab?: (tab: 'workbench' | 'viewer' | 'review') => void;
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
