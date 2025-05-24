// AI Summary: OpenAI API key provider with format validation.
// Validates OpenAI API keys against expected patterns and prefixes.

import { IApiProviderValidator } from './ProviderInterface';
import { ApiProvider } from '../types';

/**
 * Provider implementation for OpenAI API keys
 * 
 * Handles OpenAI-specific validation and format checking.
 * OpenAI API keys have distinctive formats that this provider validates.
 */
export class OpenAIProvider implements IApiProviderValidator {
  readonly providerId: ApiProvider = 'openai';

  // Validation pattern for OpenAI API keys
  // OpenAI keys can start with various prefixes and contain different character sets
  // Support for keys up to 200 characters to accommodate newer API key formats
  private readonly validationPattern = /^(sk|org)-[A-Za-z0-9-_]{32,200}$/;

  /**
   * Validates if an API key has the correct format for OpenAI
   * 
   * OpenAI API keys typically:
   * - Start with prefixes like 'sk-' or 'org-'
   * - May be up to 200 characters long (newer formats are longer than older ones)
   * - Can include alphanumeric characters, hyphens, and underscores
   * 
   * @param apiKey The API key to validate
   * @returns true if the API key has a valid format, false otherwise
   */
  validateApiKey(apiKey: string): boolean {
    return this.validationPattern.test(apiKey);
  }
}
