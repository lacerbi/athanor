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
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1.0,
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
  openai: {
    temperature: 0.7,
    maxTokens: 4096, // OpenAI models generally handle larger outputs well
    topP: 1.0,
  },
  anthropic: {
    temperature: 0.7,
    maxTokens: 4096, // Claude models have large context windows
    topP: 1.0,
  },
  gemini: {
    temperature: 0.7,
    maxTokens: 8192, // Gemini models have very large context windows
    topP: 1.0,
    geminiSafetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_TOXICITY', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_VIOLENCE', threshold: 'BLOCK_NONE' },
    ],
  },
  mistral: {
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1.0,
  },
};

/**
 * Per-model default setting overrides (takes precedence over provider defaults)
 */
export const MODEL_DEFAULT_SETTINGS: Record<string, Partial<LLMSettings>> = {
  // OpenAI model-specific overrides
  'gpt-4o-mini': {
    maxTokens: 16384, // Mini model optimized for smaller outputs
    temperature: 0.7,
  },
  'gpt-4o': {
    maxTokens: 4096,
    temperature: 0.7,
  },

  // Anthropic model-specific overrides
  'claude-3-haiku-20240307': {
    maxTokens: 4096,
    temperature: 0.7,
  },
  'claude-3-5-sonnet-20241022': {
    maxTokens: 8192,
    temperature: 0.7,
  },
  'claude-3-opus-20240229': {
    maxTokens: 4096,
    temperature: 0.6, // Slightly lower for more focused responses
  },

  // Gemini model-specific overrides
  'gemini-1.5-flash-002': {
    maxTokens: 8192,
    temperature: 0.8,
  },
  'gemini-1.5-pro-002': {
    maxTokens: 8192,
    temperature: 0.7,
  },

  // Mistral model-specific overrides
  'mistral-large-latest': {
    maxTokens: 4096,
    temperature: 0.7,
  },
  'mistral-small-latest': {
    maxTokens: 2048,
    temperature: 0.8,
  },
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
  // OpenAI Models
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    providerId: 'openai',
    contextWindow: 128000,
    inputPricing: 0.15, // per 1M tokens
    outputPricing: 0.6, // per 1M tokens
    supportsSystemMessage: true,
    notes: 'Most cost-effective model for everyday tasks',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    providerId: 'openai',
    contextWindow: 128000,
    inputPricing: 2.5, // per 1M tokens
    outputPricing: 10.0, // per 1M tokens
    supportsSystemMessage: true,
    notes: 'Latest GPT-4 model with enhanced multimodal capabilities',
  },

  // Anthropic Models
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    providerId: 'anthropic',
    contextWindow: 200000,
    inputPricing: 0.25, // per 1M tokens
    outputPricing: 1.25, // per 1M tokens
    supportsSystemMessage: true,
    notes: 'Fastest and most cost-effective Claude model',
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    providerId: 'anthropic',
    contextWindow: 200000,
    inputPricing: 3.0, // per 1M tokens
    outputPricing: 15.0, // per 1M tokens
    supportsSystemMessage: true,
    notes: 'Best balance of intelligence, speed, and cost',
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    providerId: 'anthropic',
    contextWindow: 200000,
    inputPricing: 15.0, // per 1M tokens
    outputPricing: 75.0, // per 1M tokens
    supportsSystemMessage: true,
    notes: 'Most capable Claude model for highly complex tasks',
  },

  // Google Gemini Models
  {
    id: 'gemini-1.5-flash-002',
    name: 'Gemini 1.5 Flash',
    providerId: 'gemini',
    contextWindow: 1000000,
    inputPricing: 0.075, // per 1M tokens
    outputPricing: 0.3, // per 1M tokens
    supportsSystemMessage: true,
    notes: 'Fast model with large context window and multimodal capabilities',
  },
  {
    id: 'gemini-1.5-pro-002',
    name: 'Gemini 1.5 Pro',
    providerId: 'gemini',
    contextWindow: 2000000,
    inputPricing: 1.25, // per 1M tokens
    outputPricing: 5.0, // per 1M tokens
    supportsSystemMessage: true,
    notes: 'Most capable Gemini model with massive context window',
  },

  // Mistral AI Models
  {
    id: 'mistral-large-latest',
    name: 'Mistral Large',
    providerId: 'mistral',
    contextWindow: 32000,
    inputPricing: 2.0, // per 1M tokens
    outputPricing: 6.0, // per 1M tokens
    supportsSystemMessage: true,
    notes:
      'Flagship model optimized for complex reasoning and multilingual tasks',
  },
  {
    id: 'mistral-small-latest',
    name: 'Mistral Small',
    providerId: 'mistral',
    contextWindow: 32000,
    inputPricing: 0.2, // per 1M tokens
    outputPricing: 0.6, // per 1M tokens
    supportsSystemMessage: true,
    notes:
      'Cost-effective model suitable for simple tasks and high-volume usage',
  },
  {
    id: 'mistral-medium-latest',
    name: 'Mistral Medium',
    providerId: 'mistral',
    contextWindow: 32000,
    inputPricing: 0.7, // per 1M tokens
    outputPricing: 2.1, // per 1M tokens
    supportsSystemMessage: true,
    notes:
      'Balanced model offering good performance for intermediate complexity tasks',
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
  // Start with global defaults
  const baseDefaults = { ...DEFAULT_LLM_SETTINGS };

  // Apply provider-specific defaults
  const providerDefaults = PROVIDER_DEFAULT_SETTINGS[providerId] || {};

  // Apply model-specific defaults (highest priority)
  const modelDefaults = MODEL_DEFAULT_SETTINGS[modelId] || {};

  // Merge all settings
  const mergedSettings = {
    ...baseDefaults,
    ...providerDefaults,
    ...modelDefaults,
  };

  // Filter out undefined values for optional fields
  const cleanedSettings = Object.fromEntries(
    Object.entries(mergedSettings).filter(([_, value]) => value !== undefined)
  ) as Required<LLMSettings>;

  return cleanedSettings;
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
