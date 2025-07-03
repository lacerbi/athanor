// AI Summary: Core type definitions for the LLM interaction module.
// Defines request/response structures, settings, provider/model info, and error handling types.

import type { ApiProvider } from 'genai-key-storage-lite';

/**
 * API provider ID type - reuses the secure storage provider types
 */
export type ApiProviderId = ApiProvider;

/**
 * Message roles supported by LLM APIs
 */
export type LLMMessageRole = 'user' | 'assistant' | 'system';

/**
 * Individual message in a conversation
 */
export interface LLMMessage {
  role: LLMMessageRole;
  content: string;
}

/**
 * Gemini harm categories for safety settings
 * Only includes categories supported by the API for safety setting rules
 */
export type GeminiHarmCategory =
  | 'HARM_CATEGORY_UNSPECIFIED'
  | 'HARM_CATEGORY_HATE_SPEECH'
  | 'HARM_CATEGORY_SEXUALLY_EXPLICIT'
  | 'HARM_CATEGORY_DANGEROUS_CONTENT'
  | 'HARM_CATEGORY_HARASSMENT'
  | 'HARM_CATEGORY_CIVIC_INTEGRITY';

/**
 * Gemini harm block thresholds for safety settings
 */
export type GeminiHarmBlockThreshold =
  | 'HARM_BLOCK_THRESHOLD_UNSPECIFIED'
  | 'BLOCK_LOW_AND_ABOVE'
  | 'BLOCK_MEDIUM_AND_ABOVE'
  | 'BLOCK_ONLY_HIGH'
  | 'BLOCK_NONE';

/**
 * Individual Gemini safety setting
 */
export interface GeminiSafetySetting {
  category: GeminiHarmCategory;
  threshold: GeminiHarmBlockThreshold;
}

/**
 * Configurable settings for LLM requests
 */
export interface LLMSettings {
  /** Controls randomness in the response (0.0 to 2.0, typically 0.0 to 1.0) */
  temperature?: number;
  /** Maximum number of tokens to generate in the response */
  maxTokens?: number;
  /** Controls diversity via nucleus sampling (0.0 to 1.0) */
  topP?: number;
  /** Sequences where the API will stop generating further tokens */
  stopSequences?: string[];
  /** Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency */
  frequencyPenalty?: number;
  /** Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far */
  presencePenalty?: number;
  /** A unique identifier representing your end-user, which can help monitor and detect abuse */
  user?: string;
  /** Whether the LLM supports system message (almost all LLMs do nowadays) */
  supportsSystemMessage?: boolean;
  /** Gemini-specific safety settings for content filtering */
  geminiSafetySettings?: GeminiSafetySetting[];
}

/**
 * Request structure for chat completion
 */
export interface LLMChatRequest {
  providerId: ApiProviderId;
  modelId: string;
  messages: LLMMessage[];
  systemMessage?: string;
  settings?: LLMSettings;
}

/**
 * Individual choice in an LLM response
 */
export interface LLMChoice {
  message: LLMMessage;
  finish_reason: string | null;
  index?: number;
}

/**
 * Token usage information from LLM APIs
 */
export interface LLMUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

/**
 * Successful response from LLM API
 */
export interface LLMResponse {
  id: string;
  provider: ApiProviderId;
  model: string;
  created: number;
  choices: LLMChoice[];
  usage?: LLMUsage;
  object: 'chat.completion';
}

/**
 * Error information from LLM APIs
 */
export interface LLMError {
  message: string;
  code?: string | number;
  type?: string;
  param?: string;
  providerError?: any;
}

/**
 * Error response from LLM operations
 */
export interface LLMFailureResponse {
  provider: ApiProviderId;
  model?: string;
  error: LLMError;
  object: 'error';
}

/**
 * Information about a supported LLM provider
 */
export interface ProviderInfo {
  id: ApiProviderId;
  name: string;
  unsupportedParameters?: (keyof LLMSettings)[];
}

/**
 * Information about a supported LLM model
 */
export interface ModelInfo {
  id: string;
  name: string;
  providerId: ApiProviderId;
  contextWindow?: number;
  inputPrice?: number;
  outputPrice?: number;
  supportsSystemMessage?: boolean;
  description?: string;
  maxTokens?: number;
  supportsImages?: boolean;
  supportsPromptCache: boolean;
  thinkingConfig?: {
    maxBudget?: number;
    outputPrice?: number;
  };
  cacheWritesPrice?: number;
  cacheReadsPrice?: number;
  unsupportedParameters?: (keyof LLMSettings)[];
}

/**
 * IPC channel names for LLM operations
 */
export const LLM_IPC_CHANNELS = {
  GET_PROVIDERS: 'llm:get-providers',
  GET_MODELS: 'llm:get-models',
  SEND_MESSAGE: 'llm:send-message',
  IS_KEY_AVAILABLE: 'llm:is-key-available',
} as const;

/**
 * Type for LLM IPC channel names
 */
export type LLMIPCChannelName =
  (typeof LLM_IPC_CHANNELS)[keyof typeof LLM_IPC_CHANNELS];
