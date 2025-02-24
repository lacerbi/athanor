// AI Summary: Provides centralized exports for action-related functionality.
// Includes generic task action handler and common utilities.

// Action handlers
export { applyAiOutput } from './ApplyAiOutputAction';
export { buildTaskAction } from './buildTaskAction';
export type { BuildTaskActionParams } from './buildTaskAction';
export { copyToClipboard } from './ManualCopyAction';

// Action descriptions
export { getActionTooltip, getTaskTooltip } from './descriptions';

// Action types
export type { ActionType, ActionState, BaseActionParams } from './types';
