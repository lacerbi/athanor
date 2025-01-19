// AI Summary: Manages prompt data using Zustand with array-based storage.
// Provides methods for retrieving prompts and variants by ID with automatic sorting by order.
// Includes active variant tracking with persistence between sessions.
import { create } from 'zustand';
import { PromptStore, PromptData, PromptVariant, DEFAULT_PROMPT_ORDER, ActiveVariants } from '../types/promptTypes';
import { persist } from 'zustand/middleware';

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

export const usePromptStore = create<PromptStore>()(
  persist(
    (set, get) => ({
      prompts: [],
      activeVariants: {},

      getPromptById: (id: string) => {
        return get().prompts.find(p => p.id === id);
      },

      getVariantById: (promptId: string, variantId: string) => {
        const prompt = get().prompts.find(p => p.id === promptId);
        return prompt?.variants.find(v => v.id === variantId);
      },

      getDefaultVariant: (promptId: string) => {
        // First check for active variant
        const activeVariant = get().getActiveVariant(promptId);
        if (activeVariant) return activeVariant;
        
        // Fall back to default variant selection logic
        const prompt = get().prompts.find(p => p.id === promptId);
        if (!prompt) return undefined;
        
        // Try to find variant with id "default"
        const defaultVariant = prompt.variants.find(v => v.id === 'default');
        if (defaultVariant) return defaultVariant;
        
        // If no default variant, return the first variant
        return prompt.variants[0];
      },

      getActiveVariant: (promptId: string) => {
        const activeVariantId = get().activeVariants[promptId];
        if (!activeVariantId) return undefined;
        
        return get().getVariantById(promptId, activeVariantId);
      },

      setActiveVariant: (promptId: string, variantId: string) => {
        const variant = get().getVariantById(promptId, variantId);
        if (!variant) return; // Don't set if variant doesn't exist

        set(state => ({
          activeVariants: {
            ...state.activeVariants,
            [promptId]: variantId
          }
        }));
      },

      resetActiveVariant: (promptId: string) => {
        set(state => {
          const { [promptId]: _, ...rest } = state.activeVariants;
          return { activeVariants: rest };
        });
      },

      setPrompts: (prompts: PromptData[]) => {
        // Sort prompts before storing them
        set({ prompts: sortPrompts(prompts) });
      },

      clearPrompts: () => set({ prompts: [], activeVariants: {} }),
    }),
    {
      name: 'athanor-prompt-store',
      partialize: (state) => ({
        activeVariants: state.activeVariants // Only persist active variants
      })
    }
  )
);
