// AI Summary: Manages prompt data using Zustand with array-based storage.
// Provides methods for retrieving prompts and variants by ID.
import { create } from 'zustand';
import { PromptStore, PromptData, PromptVariant } from '../types/promptTypes';

export const usePromptStore = create<PromptStore>((set, get) => ({
  prompts: [],

  getPromptById: (id: string) => {
    return get().prompts.find(p => p.id === id);
  },

  getVariantById: (promptId: string, variantId: string) => {
    const prompt = get().prompts.find(p => p.id === promptId);
    return prompt?.variants.find(v => v.id === variantId);
  },

  setPrompts: (prompts: PromptData[]) => {
    set({ prompts });
  },

  clearPrompts: () => set({ prompts: [] }),
}));
