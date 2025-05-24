// AI Summary: Google Gemini API key provider with format validation.
// Validates Gemini API keys against expected AI prefix patterns.

import { IApiProviderValidator } from './ProviderInterface';
import { ApiProvider } from '../types';

/**
 * Provider implementation for Google Gemini API keys
 * 
 * Handles Gemini-specific validation and format checking.
 * Gemini API keys have a distinctive format that this provider validates.
 */
export class GeminiProvider implements IApiProviderValidator {
  readonly providerId: ApiProvider = 'gemini';

  // Validation pattern for Gemini API keys
  // Google Gemini API keys typically:
  // - Start with "AI" prefix
  // - Are approximately 43 characters long
  // - Include alphanumeric characters, underscores, and hyphens
  private readonly validationPattern = /^AI[A-Za-z0-9_-]{35,45}$/;

  /**
   * Validates if an API key has the correct format for Google Gemini
   * 
   * Gemini API keys typically:
   * - Start with the prefix 'AI'
   * - Are approximately 43 characters long in total
   * - Can include alphanumeric characters, underscores, and hyphens
   * 
   * @param apiKey The API key to validate
   * @returns true if the API key has a valid format, false otherwise
   */
  validateApiKey(apiKey: string): boolean {
    return this.validationPattern.test(apiKey);
  }
}
