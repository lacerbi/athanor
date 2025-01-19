// AI Summary: Defines types for prompt data including metadata and variants.
// Provides interfaces for prompt store state and operations.
export interface PromptVariant {
  id: string;
  label: string;
  tooltip?: string;
  content: string;  // Raw unparsed content
}

export interface PromptData {
  id: string;
  label: string;
  icon?: string;
  tooltip?: string;
  variants: PromptVariant[];
}

export interface PromptStore {
  prompts: PromptData[];
  getPromptById: (id: string) => PromptData | undefined;
  getVariantById: (promptId: string, variantId: string) => PromptVariant | undefined;
  setPrompts: (prompts: PromptData[]) => void;
  clearPrompts: () => void;
}
