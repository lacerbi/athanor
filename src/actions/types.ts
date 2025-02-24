// AI Summary: Defines TypeScript types for action-related functionality.
// Includes action types, states, and parameters for action handlers.

// Action type constants
export type ActionType =
  | 'fileHighlighter'
  | 'softwareEngineer'
  | 'developer';

// Action state types
export type ActionState = 'loading' | 'noTask' | 'noSelection';

// Common action parameters
export interface BaseActionParams {
  addLog: (message: string) => void;
  setIsLoading: (loading: boolean) => void;
}
