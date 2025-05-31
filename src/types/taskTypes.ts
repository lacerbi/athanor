// AI Summary: Defines types for task data including metadata and content.
// Provides interfaces for task store state and operations with proper validation.

export interface TaskVariant {
  id: string;
  label: string;
  tooltip?: string;
  content: string;
}

export interface TaskData {
  id: string;
  label: string;
  icon?: string;
  tooltip?: string;
  order: number;
  requires?: 'selected'; // Optional requirement for task activation
  variants: TaskVariant[];
  source?: 'default' | 'global' | 'project';
}

// Record to track active variants for each task
export type ActiveVariants = Record<string, string>;

export interface TaskStore {
  tasks: TaskData[];
  activeVariants: ActiveVariants;
  getTaskById: (id: string) => TaskData | undefined;
  getVariantById: (taskId: string, variantId: string) => TaskVariant | undefined;
  getDefaultVariant: (taskId: string) => TaskVariant | undefined;
  getActiveVariant: (taskId: string) => TaskVariant | undefined;
  setActiveVariant: (taskId: string, variantId: string) => void;
  resetActiveVariant: (taskId: string) => void;
  setTasks: (tasks: TaskData[]) => void;
  clearTasks: () => void;
}

// Default order value for tasks that don't specify an order attribute
export const DEFAULT_TASK_ORDER = 1000;
