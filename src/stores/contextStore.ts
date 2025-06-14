// AI Summary: Manages the state of the intelligent context builder.
// Stores which files are 'selected' vs. 'neighboring' and handles fetching this context
// from the main process via an IPC call to the RelevanceEngineService.

import { create } from 'zustand';

interface ContextState {
  selectedFiles: Set<string>;
  userSelectedPaths: string[];
  heuristicSeedPaths: string[];
  neighboringFiles: Map<string, number>;
  maxNeighborScore: number;
  promptNeighborPaths: Set<string>;
  isLoading: boolean;
  isAnalyzingGraph: boolean;
  fetchContext: (selectedPaths: string[], taskDescription?: string) => Promise<void>;
  clearContext: () => void;
  setIsAnalyzingGraph: (isAnalyzing: boolean) => void;
}

export const useContextStore = create<ContextState>((set) => ({
  selectedFiles: new Set(),
  userSelectedPaths: [],
  heuristicSeedPaths: [],
  neighboringFiles: new Map(),
  maxNeighborScore: 0,
  promptNeighborPaths: new Set(),
  isLoading: false,
  isAnalyzingGraph: false,

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
        selectedFiles: new Set(result.userSelected),
        userSelectedPaths: result.userSelected,
        heuristicSeedPaths: result.heuristicSeedFiles,
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
      userSelectedPaths: [],
      heuristicSeedPaths: [],
      neighboringFiles: new Map(),
      maxNeighborScore: 0,
      promptNeighborPaths: new Set(),
      isLoading: false,
    });
  },

  setIsAnalyzingGraph: (isAnalyzing: boolean) =>
    set({ isAnalyzingGraph: isAnalyzing }),
}));
