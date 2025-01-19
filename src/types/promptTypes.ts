// AI Summary: Defines types for prompt data including metadata and variants.
// Provides interfaces for prompt store state and operations with order configuration.
export interface PromptVariant {
  id: string;
  label: string;
  tooltip?: string;
  content: string; // Raw unparsed content
}

export interface PromptData {
  id: string;
  label: string;
  icon?: string;
  tooltip?: string;
  order: number;
  variants: PromptVariant[];
}

// Record to track active variants for each prompt
export type ActiveVariants = Record<string, string>;

export interface PromptStore {
  prompts: PromptData[];
  activeVariants: ActiveVariants;
  getPromptById: (id: string) => PromptData | undefined;
  getVariantById: (
    promptId: string,
    variantId: string
  ) => PromptVariant | undefined;
  getDefaultVariant: (promptId: string) => PromptVariant | undefined;
  getActiveVariant: (promptId: string) => PromptVariant | undefined;
  setActiveVariant: (promptId: string, variantId: string) => void;
  resetActiveVariant: (promptId: string) => void;
  setPrompts: (prompts: PromptData[]) => void;
  clearPrompts: () => void;
}

// Default order value for prompts that don't specify an order attribute
export const DEFAULT_PROMPT_ORDER = 1000;
