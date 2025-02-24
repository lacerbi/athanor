// AI Summary: Manages task data using Zustand with array-based storage.
// Provides methods for retrieving tasks and variants by ID with automatic sorting by order.
// Includes active variant tracking with persistence between sessions.
import { create } from 'zustand';
import { TaskStore, TaskData, TaskVariant, DEFAULT_TASK_ORDER, ActiveVariants } from '../types/taskTypes';
import { persist } from 'zustand/middleware';

// Sort tasks by order (ascending) and then by ID (alphabetically)
function sortTasks(tasks: TaskData[]): TaskData[] {
  return [...tasks].sort((a, b) => {
    // First compare by order
    const orderDiff = (a.order ?? DEFAULT_TASK_ORDER) - (b.order ?? DEFAULT_TASK_ORDER);
    if (orderDiff !== 0) return orderDiff;
    
    // If orders are equal, sort alphabetically by ID
    return a.id.localeCompare(b.id);
  });
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      activeVariants: {},

      getTaskById: (id: string) => {
        return get().tasks.find(t => t.id === id);
      },

      getVariantById: (taskId: string, variantId: string) => {
        const task = get().tasks.find(t => t.id === taskId);
        return task?.variants.find(v => v.id === variantId);
      },

      getDefaultVariant: (taskId: string) => {
        // First check for active variant
        const activeVariant = get().getActiveVariant(taskId);
        if (activeVariant) return activeVariant;
        
        // Fall back to default variant selection logic
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) return undefined;
        
        // Try to find variant with id "default"
        const defaultVariant = task.variants.find(v => v.id === 'default');
        if (defaultVariant) return defaultVariant;
        
        // If no default variant, return the first variant
        return task.variants[0];
      },

      getActiveVariant: (taskId: string) => {
        const activeVariantId = get().activeVariants[taskId];
        if (!activeVariantId) return undefined;
        
        return get().getVariantById(taskId, activeVariantId);
      },

      setActiveVariant: (taskId: string, variantId: string) => {
        const variant = get().getVariantById(taskId, variantId);
        if (!variant) return; // Don't set if variant doesn't exist

        set(state => ({
          activeVariants: {
            ...state.activeVariants,
            [taskId]: variantId
          }
        }));
      },

      resetActiveVariant: (taskId: string) => {
        set(state => {
          const { [taskId]: _, ...rest } = state.activeVariants;
          return { activeVariants: rest };
        });
      },

      setTasks: (tasks: TaskData[]) => {
        // Sort tasks before storing them
        set({ tasks: sortTasks(tasks) });
      },

      clearTasks: () => set({ tasks: [], activeVariants: {} }),
    }),
    {
      name: 'athanor-task-store',
      partialize: (state) => ({
        activeVariants: state.activeVariants // Only persist active variants
      })
    }
  )
);
