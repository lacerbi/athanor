// AI Summary: Provides centralized exports for action-related functionality.
// Includes action handlers, descriptions, and types for clean imports.

// Action handlers
export { applyAiOutput } from './ApplyAiOutputAction';
export { autoSelectFiles } from './AutoSelectAction';
export { buildAiSummaryPromptAction } from './BuildAiSummaryAction';
export { buildRefactorPromptAction } from './BuildRefactorAction';
export { buildSoftwareEngineerPromptAction } from './BuildSoftwareEngineerPromptAction';
export { buildTaskPrompt } from './BuildTaskAction';
export { copyToClipboard } from './ManualCopyAction';

// Action descriptions
export { getActionTooltip } from './descriptions';

// Action types
export type { ActionType, ActionState, BaseActionParams } from './types';
