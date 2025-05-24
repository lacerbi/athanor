// AI Summary: Interface definition for API provider validator implementations.
// Defines contract for provider identification and API key format validation.

import { ApiProvider } from '../types';

/**
 * Interface for API provider validator implementations
 * 
 * Each API provider (OpenAI, Anthropic, etc.) implements this interface
 * to provide provider-specific validation logic for API keys.
 */
export interface IApiProviderValidator {
  /**
   * The unique identifier for this provider
   */
  readonly providerId: ApiProvider;

  /**
   * Validates if an API key has the correct format for this provider
   * 
   * @param apiKey The API key to validate
   * @returns true if the API key has a valid format, false otherwise
   */
  validateApiKey(apiKey: string): boolean;
}
