// AI Summary: Provides centralized exports for action-related functionality.
// Includes action handlers for preset tasks and common utilities.

// Action handlers
export { applyAiOutput } from './ApplyAiOutputAction';
export { buildAiSummaryPromptAction } from './BuildAiSummaryAction';
export { buildRefactorPromptAction } from './BuildRefactorAction';
export { copyToClipboard } from './ManualCopyAction';

// Action descriptions
export { getActionTooltip } from './descriptions';

// Action types
export type { ActionType, ActionState, BaseActionParams } from './types';
