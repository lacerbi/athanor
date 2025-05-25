// AI Summary: Interface definition for LLM client adapters that handle provider-specific API calls.
// Defines the contract that all LLM provider clients must implement with enhanced type safety.

import type { LLMChatRequest, LLMResponse, LLMFailureResponse, LLMSettings } from '../../common/types';

/**
 * Internal request structure used by client adapters with applied defaults
 * This ensures all settings have values and adapters don't need to handle undefined values
 */
export interface InternalLLMChatRequest extends Omit<LLMChatRequest, 'settings'> {
  settings: Required<LLMSettings>;
}

/**
 * Interface that all LLM client adapters must implement
 * 
 * Client adapters handle the provider-specific logic for:
 * - Formatting requests according to provider API requirements
 * - Making HTTP calls to provider endpoints
 * - Parsing responses into standardized format
 * - Handling provider-specific errors
 * - Managing provider-specific authentication
 */
export interface ILLMClientAdapter {
  /**
   * Sends a chat message to the LLM provider
   * 
   * @param request - The LLM request with applied default settings
   * @param apiKey - The decrypted API key for the provider
   * @returns Promise resolving to either a successful response or failure response
   * 
   * @throws Should not throw - all errors should be caught and returned as LLMFailureResponse
   */
  sendMessage(request: InternalLLMChatRequest, apiKey: string): Promise<LLMResponse | LLMFailureResponse>;

  /**
   * Optional method to validate API key format before making requests
   * 
   * @param apiKey - The API key to validate
   * @returns True if the key format appears valid for this provider
   */
  validateApiKey?(apiKey: string): boolean;

  /**
   * Optional method to get provider-specific information
   * 
   * @returns Information about this adapter's capabilities or configuration
   */
  getAdapterInfo?(): {
    providerId: string;
    name: string;
    version?: string;
  };
}

/**
 * Base error codes that adapters should use for consistency
 */
export const ADAPTER_ERROR_CODES = {
  INVALID_API_KEY: 'INVALID_API_KEY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  MODEL_NOT_FOUND: 'MODEL_NOT_FOUND',
  CONTEXT_LENGTH_EXCEEDED: 'CONTEXT_LENGTH_EXCEEDED',
  CONTENT_FILTER: 'CONTENT_FILTER',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

/**
 * Helper type for adapter error codes
 */
export type AdapterErrorCode = typeof ADAPTER_ERROR_CODES[keyof typeof ADAPTER_ERROR_CODES];
