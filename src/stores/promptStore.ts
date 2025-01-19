// AI Summary: Manages prompt data using Zustand with array-based storage.
// Provides methods for retrieving prompts and variants by ID with automatic sorting by order.
import { create } from 'zustand';
import { PromptStore, PromptData, PromptVariant, DEFAULT_PROMPT_ORDER } from '../types/promptTypes';

// Sort prompts by order (ascending) and then by ID (alphabetically)
function sortPrompts(prompts: PromptData[]): PromptData[] {
  return [...prompts].sort((a, b) => {
    // First compare by order
    const orderDiff = (a.order ?? DEFAULT_PROMPT_ORDER) - (b.order ?? DEFAULT_PROMPT_ORDER);
    if (orderDiff !== 0) return orderDiff;
    
    // If orders are equal, sort alphabetically by ID
    return a.id.localeCompare(b.id);
  });
}

export const usePromptStore = create<PromptStore>((set, get) => ({
  prompts: [],

  getPromptById: (id: string) => {
    return get().prompts.find(p => p.id === id);
  },

  getDefaultVariant: (promptId: string) => {
    const prompt = get().prompts.find(p => p.id === promptId);
    if (!prompt) return undefined;
    
    // First try to find variant with id "default"
    const defaultVariant = prompt.variants.find(v => v.id === 'default');
    if (defaultVariant) return defaultVariant;
    
    // If no default variant, return the first variant
    return prompt.variants[0];
  },

  getVariantById: (promptId: string, variantId: string) => {
    const prompt = get().prompts.find(p => p.id === promptId);
    return prompt?.variants.find(v => v.id === variantId);
  },

  setPrompts: (prompts: PromptData[]) => {
    // Sort prompts before storing them
    set({ prompts: sortPrompts(prompts) });
  },

  clearPrompts: () => set({ prompts: [] }),
}));
