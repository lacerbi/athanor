// AI Summary: Provides tooltips and human-readable names for UI action buttons.
// Handles state-based tooltip generation with proper typing for actions and states.
import { ActionState } from './types';
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
  action: string,
  isDisabled: boolean,
  reason: ActionState | null
): string {
  if (!isDisabled) {
    return action;
  }

  // Return reason-specific messages for disabled state
  switch (reason) {
    case 'loading':
      return 'Please wait while the current operation completes';
    case 'noTask':
      return `${action} - Enter a task description to enable`;
    case 'noSelection':
      return `${action} - Select one or more files to enable`;
    default:
      return 'Action currently unavailable';
  }
}
