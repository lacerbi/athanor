// AI Summary: Manages the state of the intelligent context builder.
// Stores which files are 'selected' vs. 'neighboring' and handles fetching this context
// from the main process via an IPC call to the RelevanceEngineService.

import { create } from 'zustand';

interface ContextState {
  selectedFiles: Set<string>;
  neighboringFiles: Set<string>;
  isLoading: boolean;
  fetchContext: (selectedPaths: string[], taskDescription?: string) => Promise<void>;
  clearContext: () => void;
}

export const useContextStore = create<ContextState>((set) => ({
  selectedFiles: new Set(),
  neighboringFiles: new Set(),
  isLoading: false,

  fetchContext: async (selectedPaths: string[], taskDescription?: string) => {
    // If there's nothing to calculate context from, reset the state.
    if (
      (!selectedPaths || selectedPaths.length === 0) &&
      (!taskDescription || taskDescription.trim() === '')
    ) {
      set({ selectedFiles: new Set(), neighboringFiles: new Set(), isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const result = await window.electronBridge.context.recalculate({
        selectedFilePaths: selectedPaths,
        taskDescription,
      });
      set({
        selectedFiles: new Set(result.selected),
        neighboringFiles: new Set(result.neighboring),
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch context:', error);
      set({ isLoading: false });
    }
  },

  clearContext: () => {
    set({
      selectedFiles: new Set(),
      neighboringFiles: new Set(),
      isLoading: false,
    });
  },
}));
