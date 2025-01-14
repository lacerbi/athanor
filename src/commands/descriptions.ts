// AI Summary: Provides human-readable descriptions for command types.
// Used for tooltip display in the command button UI.
import { parseCommand } from './parser';
import { COMMAND_TYPES } from './types';

// Get tooltip for clipboard command state
export function getCommandDescription(clipboardContent: string | null): string {
  if (!clipboardContent) {
    return 'Copy AI output to clipboard to enable changes';
  }

  const commands = parseCommand(clipboardContent);
  if (!commands) {
    return 'No valid AI commands found in clipboard';
  }

  if (commands.length === 1) {
    // Single command description
    const command = commands[0];
    switch (command.type) {
      case COMMAND_TYPES.APPLY_CHANGES:
        return 'Review and apply file changes from clipboard';
      case COMMAND_TYPES.SELECT:
        return 'Select files based on selection command';
      case COMMAND_TYPES.TASK:
        return 'Update task description with content from clipboard';
      default:
        return `Execute ${command.type} command from clipboard`;
    }
  } else {
    // Multiple commands description
    return `Execute ${commands.length} commands from clipboard`;
  }
}
