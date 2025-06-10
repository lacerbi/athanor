// AI Summary: Manages the state of the intelligent context builder.
// Stores which files are 'selected' vs. 'neighboring' and handles fetching this context
// from the main process via an IPC call to the RelevanceEngineService.

import { create } from 'zustand';

interface ContextState {
  selectedFiles: Set<string>;
  neighboringFiles: Map<string, number>;
  maxNeighborScore: number;
  promptNeighborPaths: Set<string>;
  isLoading: boolean;
  fetchContext: (selectedPaths: string[], taskDescription?: string) => Promise<void>;
  clearContext: () => void;
}

export const useContextStore = create<ContextState>((set) => ({
  selectedFiles: new Set(),
  neighboringFiles: new Map(),
  maxNeighborScore: 0,
  promptNeighborPaths: new Set(),
  isLoading: false,

  fetchContext: async (selectedPaths: string[], taskDescription?: string) => {
    set({ isLoading: true });
    try {
      const result = await window.electronBridge.context.recalculate({
        selectedFilePaths: selectedPaths,
        taskDescription,
      });
      const neighborMap = new Map(result.allNeighbors.map(n => [n.path, n.score]));
      const maxScore = Math.max(0, ...neighborMap.values());

      set({
        selectedFiles: new Set(result.selected),
        neighboringFiles: neighborMap,
        maxNeighborScore: maxScore,
        promptNeighborPaths: new Set(result.promptNeighbors),
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
      neighboringFiles: new Map(),
      maxNeighborScore: 0,
      promptNeighborPaths: new Set(),
      isLoading: false,
    });
  },
}));
