// AI Summary: Service for managing API provider instances and validation.
// Centralizes provider registration, lookup, and API key format validation across all supported providers.

import { IApiProviderValidator } from './ProviderInterface';
import { ApiProvider } from '../types';
import { OpenAIProvider } from './OpenAIProvider';
import { AnthropicProvider } from './AnthropicProvider';
import { GeminiProvider } from './GeminiProvider';
import { MistralProvider } from './MistralProvider';

/**
 * Service for managing API provider instances and validation
 * 
 * This service maintains a registry of all supported API providers and provides
 * centralized access to provider-specific validation logic. It automatically
 * registers all built-in providers on instantiation.
 */
export class ProviderService {
  private providers: Map<ApiProvider, IApiProviderValidator> = new Map();

  /**
   * Creates a new ProviderService and registers all built-in providers
   */
  constructor() {
    this.registerBuiltInProviders();
  }

  /**
   * Gets a provider validator by its ID
   * 
   * @param providerId The provider ID to look up
   * @returns The provider validator or undefined if not found
   */
  getProvider(providerId: ApiProvider): IApiProviderValidator | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Validates an API key for a specific provider
   * 
   * @param providerId The provider to validate against
   * @param apiKey The API key to validate
   * @returns true if the API key has a valid format, false otherwise
   */
  validateApiKey(providerId: ApiProvider, apiKey: string): boolean {
    const provider = this.getProvider(providerId);
    return provider ? provider.validateApiKey(apiKey) : false;
  }

  /**
   * Gets all registered provider IDs
   * 
   * @returns Array of all registered provider IDs
   */
  getAllProviderIds(): ApiProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Registers a provider validator
   * 
   * @param provider The provider validator to register
   */
  registerProvider(provider: IApiProviderValidator): void {
    this.providers.set(provider.providerId, provider);
  }

  /**
   * Registers all built-in provider validators
   * 
   * @private
   */
  private registerBuiltInProviders(): void {
    this.registerProvider(new OpenAIProvider());
    this.registerProvider(new AnthropicProvider());
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new MistralProvider());
  }
}
