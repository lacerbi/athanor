// AI Summary: Centralizes command-related type definitions and constants.
// Provides type safety for command handling throughout the application.

// Command type constants
export const COMMAND_TYPES = {
  SELECT: 'select',
  TASK: 'task',
  APPLY_CHANGES: 'apply changes',
} as const;

export type CommandType = typeof COMMAND_TYPES[keyof typeof COMMAND_TYPES];

// Re-export common types used across commands
export type { FileOperation } from '../types/global';
