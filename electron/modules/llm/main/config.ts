// AI Summary: Configuration for LLM module including default settings, supported providers, and models.
// Defines operational parameters and available LLM options for the application.

import type {
  LLMSettings,
  ProviderInfo,
  ModelInfo,
  ApiProviderId,
  GeminiSafetySetting,
  GeminiHarmCategory,
  GeminiHarmBlockThreshold,
} from '../common/types';
import type { ILLMClientAdapter } from './clients/types';
import { OpenAIClientAdapter } from './clients/OpenAIClientAdapter';
import { AnthropicClientAdapter } from './clients/AnthropicClientAdapter';
import { GeminiClientAdapter } from './clients/GeminiClientAdapter';
// Placeholder for future imports:
// import { MistralClientAdapter } from './clients/MistralClientAdapter';

/**
 * Mapping from provider IDs to their corresponding adapter constructor classes
 * This enables dynamic registration of client adapters in LLMServiceMain
 */
export const ADAPTER_CONSTRUCTORS: Partial<
  Record<
    ApiProviderId,
    new (config?: { baseURL?: string }) => ILLMClientAdapter
  >
> = {
  openai: OpenAIClientAdapter,
  anthropic: AnthropicClientAdapter,
  gemini: GeminiClientAdapter,
  // 'mistral': MistralClientAdapter, // Uncomment and add when Mistral adapter is ready
};

/**
 * Optional configuration objects for each adapter
 * Allows passing parameters like baseURL during instantiation
 */
export const ADAPTER_CONFIGS: Partial<
  Record<ApiProviderId, { baseURL?: string }>
> = {
  openai: {
    baseURL: process.env.OPENAI_API_BASE_URL || undefined,
  },
  anthropic: {
    baseURL: process.env.ANTHROPIC_API_BASE_URL || undefined,
  },
  // 'gemini': { /* ... Gemini specific config ... */ },
  // 'mistral': { /* ... Mistral specific config ... */ },
};

/**
 * Default settings applied to all LLM requests unless overridden
 */
export const DEFAULT_LLM_SETTINGS: Required<LLMSettings> = {
  temperature: 0.5,
  maxTokens: 4096,
  topP: 0.95,
  stopSequences: [],
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
  user: undefined as any, // Will be filtered out when undefined
  geminiSafetySettings: [
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  ],
};

/**
 * Per-provider default setting overrides
 */
export const PROVIDER_DEFAULT_SETTINGS: Partial<
  Record<ApiProviderId, Partial<LLMSettings>>
> = {
  openai: {},
  anthropic: {},
  gemini: {
    geminiSafetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_TOXICITY', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_VIOLENCE', threshold: 'BLOCK_NONE' },
    ],
  },
  mistral: {},
};

/**
 * Per-model default setting overrides (takes precedence over provider defaults)
 */
export const MODEL_DEFAULT_SETTINGS: Record<string, Partial<LLMSettings>> = {
  // OpenAI model-specific overrides
  // Anthropic model-specific overrides
  // Gemini model-specific overrides
  // Mistral model-specific overrides
};

/**
 * Supported LLM providers
 */
export const SUPPORTED_PROVIDERS: ProviderInfo[] = [
  {
    id: 'openai',
    name: 'OpenAI',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
  },
];

/**
 * Supported LLM models with their configurations
 */
export const SUPPORTED_MODELS: ModelInfo[] = [
  // Anthropic Models
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    providerId: 'anthropic',
    contextWindow: 200000,
    inputPrice: 3.0,
    outputPrice: 15.0,
    supportsSystemMessage: true,
    description: 'Latest Claude Sonnet model with enhanced capabilities',
    maxTokens: 8192,
    supportsImages: true,
    supportsPromptCache: true,
    cacheWritesPrice: 3.75,
    cacheReadsPrice: 0.3,
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    providerId: 'anthropic',
    contextWindow: 200000,
    inputPrice: 15.0,
    outputPrice: 75.0,
    supportsSystemMessage: true,
    description: 'Most powerful Claude model for highly complex tasks',
    maxTokens: 8192,
    supportsImages: true,
    supportsPromptCache: true,
    cacheWritesPrice: 18.75,
    cacheReadsPrice: 1.5,
  },
  {
    id: 'claude-3-7-sonnet-20250219',
    name: 'Claude 3.7 Sonnet',
    providerId: 'anthropic',
    contextWindow: 200000,
    inputPrice: 3.0,
    outputPrice: 15.0,
    supportsSystemMessage: true,
    description: 'Advanced Claude model with improved reasoning',
    maxTokens: 8192,
    supportsImages: true,
    supportsPromptCache: true,
    cacheWritesPrice: 3.75,
    cacheReadsPrice: 0.3,
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    providerId: 'anthropic',
    contextWindow: 200000,
    inputPrice: 3.0,
    outputPrice: 15.0,
    supportsSystemMessage: true,
    description: 'Best balance of intelligence, speed, and cost',
    maxTokens: 8192,
    supportsImages: true,
    supportsPromptCache: true,
    cacheWritesPrice: 3.75,
    cacheReadsPrice: 0.3,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    providerId: 'anthropic',
    contextWindow: 200000,
    inputPrice: 0.8,
    outputPrice: 4.0,
    supportsSystemMessage: true,
    description: 'Fastest and most cost-effective Claude model',
    maxTokens: 8192,
    supportsImages: false,
    supportsPromptCache: true,
    cacheWritesPrice: 1.0,
    cacheReadsPrice: 0.08,
  },

  // Google Gemini Models
  {
    id: 'gemini-2.5-pro-preview-05-06',
    name: 'Gemini 2.5 Pro',
    providerId: 'gemini',
    contextWindow: 1048576,
    inputPrice: 2.5,
    outputPrice: 15,
    supportsSystemMessage: true,
    description:
      'Most advanced Gemini model for complex reasoning and multimodal tasks',
    maxTokens: 65536,
    supportsImages: true,
    supportsPromptCache: true,
    cacheReadsPrice: 0.31,
  },
  {
    id: 'gemini-2.5-flash-preview-05-20',
    name: 'Gemini 2.5 Flash',
    providerId: 'gemini',
    contextWindow: 1048576,
    inputPrice: 0.15,
    outputPrice: 0.6,
    supportsSystemMessage: true,
    description:
      'Fast, efficient model with large context and reasoning capabilities',
    maxTokens: 65536,
    supportsImages: true,
    supportsPromptCache: false,
    thinkingConfig: {
      maxBudget: 24576,
      outputPrice: 3.5,
    },
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    providerId: 'gemini',
    contextWindow: 1048576,
    inputPrice: 0.1,
    outputPrice: 0.4,
    supportsSystemMessage: true,
    description: 'High-performance model with multimodal capabilities',
    maxTokens: 8192,
    supportsImages: true,
    supportsPromptCache: true,
    cacheReadsPrice: 0.025,
    cacheWritesPrice: 1.0,
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    providerId: 'gemini',
    contextWindow: 1048576,
    inputPrice: 0.075,
    outputPrice: 0.3,
    supportsSystemMessage: true,
    description: 'Lightweight version of Gemini 2.0 Flash',
    maxTokens: 8192,
    supportsImages: true,
    supportsPromptCache: false,
  },

  // OpenAI Models
  {
    id: 'o4-mini',
    name: 'o4-mini',
    providerId: 'openai',
    contextWindow: 200000,
    inputPrice: 1.1,
    outputPrice: 4.4,
    supportsSystemMessage: true,
    description: 'Advanced reasoning model with high token capacity',
    maxTokens: 100000,
    supportsImages: true,
    supportsPromptCache: true,
    cacheReadsPrice: 0.275,
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    providerId: 'openai',
    contextWindow: 1047576,
    inputPrice: 2,
    outputPrice: 8,
    supportsSystemMessage: true,
    description: 'Latest GPT-4 model with enhanced capabilities',
    maxTokens: 32768,
    supportsImages: true,
    supportsPromptCache: true,
    cacheReadsPrice: 0.5,
  },
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    providerId: 'openai',
    contextWindow: 1047576,
    inputPrice: 0.4,
    outputPrice: 1.6,
    supportsSystemMessage: true,
    description: 'Smaller version of GPT-4.1 for cost-effective tasks',
    maxTokens: 32768,
    supportsImages: true,
    supportsPromptCache: true,
    cacheReadsPrice: 0.1,
  },
  {
    id: 'gpt-4.1-nano',
    name: 'GPT-4.1 Nano',
    providerId: 'openai',
    contextWindow: 1047576,
    inputPrice: 0.1,
    outputPrice: 0.4,
    supportsSystemMessage: true,
    description: 'Ultra-efficient version of GPT-4.1',
    maxTokens: 32768,
    supportsImages: true,
    supportsPromptCache: true,
    cacheReadsPrice: 0.025,
  },

  // Mistral AI Models
  {
    id: 'codestral-2501',
    name: 'Codestral',
    providerId: 'mistral',
    contextWindow: 256000,
    inputPrice: 0.3,
    outputPrice: 0.9,
    supportsSystemMessage: true,
    description: 'Specialized model for code generation and programming tasks',
    maxTokens: 256000,
    supportsImages: false,
    supportsPromptCache: false,
  },
  {
    id: 'devstral-small-2505',
    name: 'Devstral Small',
    providerId: 'mistral',
    contextWindow: 131072,
    inputPrice: 0.1,
    outputPrice: 0.3,
    supportsSystemMessage: true,
    description: 'Compact development-focused model',
    maxTokens: 128000,
    supportsImages: false,
    supportsPromptCache: false,
  },
];

/**
 * Gets provider information by ID
 *
 * @param providerId - The provider ID to look up
 * @returns The provider info or undefined if not found
 */
export function getProviderById(providerId: string): ProviderInfo | undefined {
  return SUPPORTED_PROVIDERS.find((provider) => provider.id === providerId);
}

/**
 * Gets model information by ID and provider
 *
 * @param modelId - The model ID to look up
 * @param providerId - The provider ID to filter by
 * @returns The model info or undefined if not found
 */
export function getModelById(
  modelId: string,
  providerId?: string
): ModelInfo | undefined {
  return SUPPORTED_MODELS.find(
    (model) =>
      model.id === modelId && (!providerId || model.providerId === providerId)
  );
}

/**
 * Gets all models for a specific provider
 *
 * @param providerId - The provider ID to filter by
 * @returns Array of model info for the provider
 */
export function getModelsByProvider(providerId: string): ModelInfo[] {
  return SUPPORTED_MODELS.filter((model) => model.providerId === providerId);
}

/**
 * Validates if a provider is supported
 *
 * @param providerId - The provider ID to validate
 * @returns True if the provider is supported
 */
export function isProviderSupported(providerId: string): boolean {
  return SUPPORTED_PROVIDERS.some((provider) => provider.id === providerId);
}

/**
 * Validates if a model is supported for a given provider
 *
 * @param modelId - The model ID to validate
 * @param providerId - The provider ID to validate against
 * @returns True if the model is supported for the provider
 */
export function isModelSupported(modelId: string, providerId: string): boolean {
  return SUPPORTED_MODELS.some(
    (model) => model.id === modelId && model.providerId === providerId
  );
}

/**
 * Gets merged default settings for a specific model and provider
 *
 * @param modelId - The model ID
 * @param providerId - The provider ID
 * @returns Merged default settings with model-specific overrides applied
 */
export function getDefaultSettingsForModel(
  modelId: string,
  providerId: ApiProviderId
): Required<LLMSettings> {
  // Base settings: global defaults, then provider-specific, then model-specific overrides
  const baseDefaults = { ...DEFAULT_LLM_SETTINGS };
  const providerDefaults = PROVIDER_DEFAULT_SETTINGS[providerId] || {};
  const modelDefaults = MODEL_DEFAULT_SETTINGS[modelId] || {};

  // Merge settings in order of precedence
  const mergedSettings = {
    ...baseDefaults,
    ...providerDefaults,
    ...modelDefaults,
  };

  // Override maxTokens from ModelInfo if available
  const modelInfo = getModelById(modelId, providerId);
  if (modelInfo && modelInfo.maxTokens !== undefined) {
    mergedSettings.maxTokens = modelInfo.maxTokens;
  }

  // Filter out undefined values and ensure required fields
  return Object.fromEntries(
    Object.entries(mergedSettings).filter(([_, value]) => value !== undefined)
  ) as Required<LLMSettings>;
}

/**
 * Valid Gemini harm categories for validation
 */
const VALID_GEMINI_HARM_CATEGORIES: GeminiHarmCategory[] = [
  'HARM_CATEGORY_UNSPECIFIED',
  'HARM_CATEGORY_DEROGATORY',
  'HARM_CATEGORY_TOXICITY',
  'HARM_CATEGORY_VIOLENCE',
  'HARM_CATEGORY_SEXUAL',
  'HARM_CATEGORY_MEDICAL',
  'HARM_CATEGORY_DANGEROUS',
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
];

/**
 * Valid Gemini harm block thresholds for validation
 */
const VALID_GEMINI_HARM_BLOCK_THRESHOLDS: GeminiHarmBlockThreshold[] = [
  'HARM_BLOCK_THRESHOLD_UNSPECIFIED',
  'BLOCK_LOW_AND_ABOVE',
  'BLOCK_MEDIUM_AND_ABOVE',
  'BLOCK_ONLY_HIGH',
  'BLOCK_NONE',
];

/**
 * Validates LLM settings values
 *
 * @param settings - The settings to validate
 * @returns Array of validation error messages, empty if valid
 */
export function validateLLMSettings(settings: Partial<LLMSettings>): string[] {
  const errors: string[] = [];

  if (settings.temperature !== undefined) {
    if (
      typeof settings.temperature !== 'number' ||
      settings.temperature < 0 ||
      settings.temperature > 2
    ) {
      errors.push('temperature must be a number between 0 and 2');
    }
  }

  if (settings.maxTokens !== undefined) {
    if (
      !Number.isInteger(settings.maxTokens) ||
      settings.maxTokens < 1 ||
      settings.maxTokens > 100000
    ) {
      errors.push('maxTokens must be an integer between 1 and 100000');
    }
  }

  if (settings.topP !== undefined) {
    if (
      typeof settings.topP !== 'number' ||
      settings.topP < 0 ||
      settings.topP > 1
    ) {
      errors.push('topP must be a number between 0 and 1');
    }
  }

  if (settings.frequencyPenalty !== undefined) {
    if (
      typeof settings.frequencyPenalty !== 'number' ||
      settings.frequencyPenalty < -2 ||
      settings.frequencyPenalty > 2
    ) {
      errors.push('frequencyPenalty must be a number between -2 and 2');
    }
  }

  if (settings.presencePenalty !== undefined) {
    if (
      typeof settings.presencePenalty !== 'number' ||
      settings.presencePenalty < -2 ||
      settings.presencePenalty > 2
    ) {
      errors.push('presencePenalty must be a number between -2 and 2');
    }
  }

  if (settings.stopSequences !== undefined) {
    if (!Array.isArray(settings.stopSequences)) {
      errors.push('stopSequences must be an array');
    } else if (settings.stopSequences.length > 4) {
      errors.push('stopSequences can contain at most 4 sequences');
    } else if (
      settings.stopSequences.some(
        (seq) => typeof seq !== 'string' || seq.length === 0
      )
    ) {
      errors.push('stopSequences must contain only non-empty strings');
    }
  }

  if (settings.user !== undefined && typeof settings.user !== 'string') {
    errors.push('user must be a string');
  }

  if (settings.geminiSafetySettings !== undefined) {
    if (!Array.isArray(settings.geminiSafetySettings)) {
      errors.push('geminiSafetySettings must be an array');
    } else {
      for (let i = 0; i < settings.geminiSafetySettings.length; i++) {
        const setting = settings.geminiSafetySettings[i];
        if (!setting || typeof setting !== 'object') {
          errors.push(
            `geminiSafetySettings[${i}] must be an object with category and threshold`
          );
          continue;
        }

        if (
          !setting.category ||
          !VALID_GEMINI_HARM_CATEGORIES.includes(setting.category)
        ) {
          errors.push(
            `geminiSafetySettings[${i}].category must be a valid Gemini harm category`
          );
        }

        if (
          !setting.threshold ||
          !VALID_GEMINI_HARM_BLOCK_THRESHOLDS.includes(setting.threshold)
        ) {
          errors.push(
            `geminiSafetySettings[${i}].threshold must be a valid Gemini harm block threshold`
          );
        }
      }
    }
  }

  return errors;
}
