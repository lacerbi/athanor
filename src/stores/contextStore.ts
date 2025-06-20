// AI Summary: Manages the state of the intelligent context builder.
// Stores which files are 'selected' vs. 'neighboring' and handles fetching this context
// from the main process via an IPC call to the RelevanceEngineService.

import { create } from 'zustand';

interface ContextState {
  selectedFiles: Set<string>;
  userSelectedPaths: string[];
  heuristicSeedFiles: Array<{ path: string; score: number }>;
  neighboringFiles: Map<string, number>;
  maxNeighborScore: number;
  promptNeighborPaths: Set<string>;
  isLoading: boolean;
  isAnalyzingGraph: boolean;
  lastRequestId: number;
  lastKey: string;
  fetchContext: (
    selectedPaths: string[],
    taskDescription?: string
  ) => Promise<void>;
  clearContext: () => void;
  setIsAnalyzingGraph: (isAnalyzing: boolean) => void;
}

export const useContextStore = create<ContextState>((set, get) => ({
  selectedFiles: new Set(),
  userSelectedPaths: [],
  heuristicSeedFiles: [],
  neighboringFiles: new Map(),
  maxNeighborScore: 0,
  promptNeighborPaths: new Set(),
  isLoading: false,
  isAnalyzingGraph: false,
  lastRequestId: 0,
  lastKey: '',

  fetchContext: async (selectedPaths: string[], taskDescription?: string) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(
        '[CTX] fetchContext called',
        { selectedPaths, taskDescription },
        new Date().toISOString(),
      );
    }

    // Add instrumentation to trace undefined taskDescription calls
    if (taskDescription === undefined && process.env.NODE_ENV !== 'production') {
      console.debug('[CTX] caller with *undefined* description – stack follows ⬇︎');
      // eslint-disable-next-line no-console
      console.trace();
    }

    // Create a key from the current inputs
    const key = JSON.stringify([selectedPaths, taskDescription || '']);
    // If the key is the same as the last one, do nothing.
    if (key === get().lastKey) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[CTX] fetchContext – identical key, early exit');
      }
      return;
    }

    const currentRequestId = get().lastRequestId + 1;
    set({ isLoading: true, lastKey: key, lastRequestId: currentRequestId });

    try {
      const result = await window.electronBridge.context.recalculate({
        selectedFilePaths: selectedPaths,
        taskDescription,
      });
      
      // Check if this is still the most recent request
      if (get().lastRequestId === currentRequestId) {
        const neighborMap = new Map(
          result.allNeighbors.map((n) => [n.path, n.score])
        );
        const maxScore = Math.max(0, ...neighborMap.values());

        set({
          selectedFiles: new Set(result.userSelected),
          userSelectedPaths: result.userSelected,
          heuristicSeedFiles: result.heuristicSeedFiles,
          neighboringFiles: neighborMap,
          maxNeighborScore: maxScore,
          promptNeighborPaths: new Set(result.promptNeighbors),
          isLoading: false,
        });
      }
      // If not the latest, do nothing.

    } catch (error) {
      console.error('Failed to fetch context:', error);
      // Also check here so a stale error doesn't affect a new request's loading state.
      if (get().lastRequestId === currentRequestId) {
        set({ isLoading: false });
      }
    }
  },

  clearContext: () => {
    set({
      selectedFiles: new Set(),
      userSelectedPaths: [],
      heuristicSeedFiles: [],
      neighboringFiles: new Map(),
      maxNeighborScore: 0,
      promptNeighborPaths: new Set(),
      isLoading: false,
      lastKey: '',
    });
  },

  setIsAnalyzingGraph: (isAnalyzing: boolean) =>
    set({ isAnalyzingGraph: isAnalyzing }),
}));
