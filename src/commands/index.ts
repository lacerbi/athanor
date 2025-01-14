// AI Summary: Centralizes command exports and provides command type constants.
// Acts as the main interface for accessing command functionality.
export { executeSelectCommand } from './selectCommand';
export { executeTaskCommand } from './taskCommand';
export { executeApplyChangesCommand } from './applyChangesCommand';
export type { SelectCommandParams } from './selectCommand';
export type { TaskCommandParams } from './taskCommand';
export type { ApplyChangesParams } from './applyChangesCommand';

// Command type constants
export const COMMAND_TYPES = {
  SELECT: 'select',
  TASK: 'task',
  APPLY_CHANGES: 'apply changes',
} as const;

export type CommandType = typeof COMMAND_TYPES[keyof typeof COMMAND_TYPES];
