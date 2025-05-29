// AI Summary: Defines TypeScript types for action-related functionality.
// Includes action states and parameters for action handlers.

// Action state types
export type ActionState = 'loading' | 'noTask' | 'noSelection';

// Common action parameters
export interface BaseActionParams {
  addLog: (message: string) => void;
  setIsLoading: (loading: boolean) => void;
}
