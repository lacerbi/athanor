// AI Summary: Mistral API key provider with format validation.
// Validates Mistral API keys against expected character patterns and length requirements.

import { IApiProviderValidator } from './ProviderInterface';
import { ApiProvider } from '../types';

/**
 * Provider implementation for Mistral API keys
 * 
 * Handles Mistral-specific validation and format checking.
 * Mistral API keys follow a specific format that this provider validates.
 */
export class MistralProvider implements IApiProviderValidator {
  readonly providerId: ApiProvider = 'mistral';

  // Validation pattern for Mistral API keys
  private readonly validationPattern = /^[A-Za-z0-9-_]{32,64}$/;

  /**
   * Validates if an API key has the correct format for Mistral
   * 
   * Mistral API keys typically:
   * - Are between 32-64 characters long
   * - Contain only alphanumeric characters, hyphens, and underscores
   * 
   * @param apiKey The API key to validate
   * @returns true if the API key has a valid format, false otherwise
   */
  validateApiKey(apiKey: string): boolean {
    return this.validationPattern.test(apiKey);
  }
}
