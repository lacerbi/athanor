// AI Summary: Anthropic API key provider with format validation.
// Validates Anthropic API keys against expected sk-ant- prefix patterns.

import { IApiProviderValidator } from './ProviderInterface';
import { ApiProvider } from '../types';

/**
 * Provider implementation for Anthropic API keys
 * 
 * Handles Anthropic-specific validation and format checking.
 * Anthropic API keys follow a specific format that this provider validates.
 */
export class AnthropicProvider implements IApiProviderValidator {
  readonly providerId: ApiProvider = 'anthropic';

  // Validation pattern for Anthropic API keys
  private readonly validationPattern = /^sk-ant-[A-Za-z0-9-_]{24,}$/;

  /**
   * Validates if an API key has the correct format for Anthropic
   * 
   * Anthropic API keys typically:
   * - Start with the prefix 'sk-ant-'
   * - Followed by at least 24 alphanumeric characters, hyphens, or underscores
   * 
   * @param apiKey The API key to validate
   * @returns true if the API key has a valid format, false otherwise
   */
  validateApiKey(apiKey: string): boolean {
    return this.validationPattern.test(apiKey);
  }
}
