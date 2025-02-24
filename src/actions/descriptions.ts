// AI Summary: Provides tooltips and human-readable names for UI action buttons.
// Handles state-based tooltip generation with proper typing for actions and states.
import { ActionType, ActionState } from './types';
import { TaskData } from '../types/taskTypes';

// Get tooltip based on task data
export function getTaskTooltip(
  task: TaskData,
  isDisabled: boolean,
  reason: ActionState | null
): string {
  if (!isDisabled) {
    return task.tooltip || task.label;
  }

  // Return reason-specific messages for disabled state
  switch (reason) {
    case 'loading':
      return 'Please wait while the current operation completes';
    case 'noTask':
      return `${task.label} - Enter a task description to enable`;
    case 'noSelection':
      return `${task.label} - Select one or more files to enable`;
    default:
      return 'Action currently unavailable';
  }
}

// Get tooltip based on action button state
export function getActionTooltip(
  action: ActionType,
  isDisabled: boolean,
  reason: ActionState | null
): string {
  if (!isDisabled) {
    switch (action) {
      case 'fileHighlighter':
        return 'Generate a prompt to highlight task-relevant files from the codebase';
      case 'softwareEngineer':
        return 'Generate a prompt for software engineer Q&A and planning';
      case 'developer':
        return 'Generate a prompt to execute a coding task';
      default:
        return action;
    }
  }

  // Return reason-specific messages for disabled state
  switch (reason) {
    case 'loading':
      return 'Please wait while the current operation completes';
    case 'noTask':
      return `${getActionName(action)} - Enter a task description to enable`;
    case 'noSelection':
      return `${getActionName(action)} - Select one or more files to enable`;
    default:
      return 'Action currently unavailable';
  }
}

// Helper to get human-readable action names
function getActionName(action: ActionType): string {
  switch (action) {
    case 'fileHighlighter':
      return 'Autoselect';
    case 'softwareEngineer':
      return 'Analyze';
    case 'developer':
      return 'Develop';
    default:
      return action;
  }
}
