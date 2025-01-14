// AI Summary: Provides tooltips and human-readable names for UI action buttons.
// Handles state-based tooltip generation for file highlighting and other actions.

// Get tooltip based on action button state
export function getActionTooltip(
  action:
    | 'fileHighlighter'
    | 'softwareEngineer'
    | 'developer'
    | 'aiSummaries'
    | 'refactorCode',
  isDisabled: boolean,
  reason: 'loading' | 'noTask' | 'noSelection' | null
): string {
  if (!isDisabled) {
    switch (action) {
      case 'fileHighlighter':
        return 'Generate a prompt to highlight task-relevant files from the codebase';
      case 'softwareEngineer':
        return 'Generate a prompt for software engineer Q&A and planning';
      case 'developer':
        return 'Generate a prompt to execute a coding task';
      case 'aiSummaries':
        return 'Set the task to (re)write AI summaries of selected files and generate a prompt';
      case 'refactorCode':
        return 'Generate a prompt to split/refactor selected file(s)';
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
function getActionName(action: string): string {
  switch (action) {
    case 'fileHighlighter':
      return 'Autoselect';
    case 'softwareEngineer':
      return 'Analyze';
    case 'developer':
      return 'Develop';
    case 'aiSummaries':
      return 'Summarize';
    case 'refactorCode':
      return 'Refactor';
    default:
      return action;
  }
}
