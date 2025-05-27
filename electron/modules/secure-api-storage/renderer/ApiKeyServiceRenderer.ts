// AI Summary: Renderer-side client service for secure API key management via IPC bridge.
// Provides typed API for UI components with client-side validation and error handling.
// Acts as the interface between React components and the main process service.

import {
  ApiProvider,
  ApiKeyStorageError,
  ProviderService,
} from '../common';

/**
 * Renderer-side client service for secure API key management
 *
 * This service provides a clean, typed API for UI components to interact with
 * the secure API key storage system. It handles:
 * - Client-side validation before sending requests to main process
 * - Type-safe communication via the preload bridge
 * - Error handling and user-friendly error messages
 * - Provider enumeration for UI dropdowns/selection
 *
 * All sensitive operations are delegated to the main process via IPC.
 */
export class ApiKeyServiceRenderer {
  private providerService: ProviderService;
  private bridge: typeof window.electronBridge.secureApiKeyManager;

  /**
   * Creates a new ApiKeyServiceRenderer instance
   *
   * @throws ApiKeyStorageError if the preload bridge is not available
   */
  constructor() {
    this.providerService = new ProviderService();

    // Ensure the preload bridge is available
    if (!window.electronBridge?.secureApiKeyManager) {
      throw new ApiKeyStorageError(
        'Secure API key bridge is not available. This may indicate a preload script issue.'
      );
    }

    this.bridge = window.electronBridge.secureApiKeyManager;
  }

  /**
   * Stores an API key securely
   *
   * Performs client-side validation before delegating to the main process.
   * This provides immediate feedback to the user without a round-trip to main.
   *
   * @param providerId The provider to store the key for
   * @param apiKey The API key to store
   * @throws ApiKeyStorageError if validation fails or storage operation fails
   */
  async storeKey(providerId: ApiProvider, apiKey: string): Promise<void> {
    // Client-side validation for immediate feedback
    if (!this.providerService.validateApiKey(providerId, apiKey)) {
      throw new ApiKeyStorageError(
        `Invalid API key format for provider: ${providerId}`
      );
    }

    try {
      const result = await this.bridge.storeKey(providerId, apiKey);
      if (!result.success) {
        throw new ApiKeyStorageError('Failed to store API key');
      }
    } catch (error) {
      // If it's already an ApiKeyStorageError, re-throw it
      if (error instanceof ApiKeyStorageError) {
        throw error;
      }

      // Handle IPC errors
      if (error && typeof error === 'object' && 'message' in error) {
        throw new ApiKeyStorageError(error.message as string);
      }

      throw new ApiKeyStorageError(
        'Failed to store API key due to an unexpected error'
      );
    }
  }

  // getKey method REMOVED for security reasons:
  // Plaintext API keys should never be accessible to the renderer process.
  // For secure API operations that require keys, functionality should be implemented
  // in a main process service that utilizes ApiKeyServiceMain.withDecryptedKey.

  /**
   * Deletes an API key from secure storage
   *
   * @param providerId The provider to delete the key for
   * @throws ApiKeyStorageError if deletion operation fails
   */
  async deleteKey(providerId: ApiProvider): Promise<void> {
    try {
      const result = await this.bridge.deleteKey(providerId);
      if (!result.success) {
        throw new ApiKeyStorageError(
          `Failed to delete API key for ${providerId}`
        );
      }
    } catch (error) {
      // If it's already an ApiKeyStorageError, re-throw it
      if (error instanceof ApiKeyStorageError) {
        throw error;
      }

      // Handle IPC errors
      if (error && typeof error === 'object' && 'message' in error) {
        throw new ApiKeyStorageError(error.message as string);
      }

      throw new ApiKeyStorageError(
        `Failed to delete API key for ${providerId}`
      );
    }
  }

  /**
   * Checks if an API key is stored for a provider
   *
   * @param providerId The provider to check
   * @returns true if a key is stored, false otherwise
   * @throws ApiKeyStorageError if the check operation fails
   */
  async isKeyStored(providerId: ApiProvider): Promise<boolean> {
    try {
      return await this.bridge.isKeyStored(providerId);
    } catch (error) {
      // If it's already an ApiKeyStorageError, re-throw it
      if (error instanceof ApiKeyStorageError) {
        throw error;
      }

      // Handle IPC errors
      if (error && typeof error === 'object' && 'message' in error) {
        throw new ApiKeyStorageError(error.message as string);
      }

      throw new ApiKeyStorageError(
        `Failed to check if API key is stored for ${providerId}`
      );
    }
  }

  /**
   * Gets all provider IDs that have stored keys
   *
   * @returns Array of provider IDs with stored keys
   * @throws ApiKeyStorageError if the operation fails
   */
  async getStoredProviderIds(): Promise<ApiProvider[]> {
    try {
      const result = await this.bridge.getStoredProviderIds();
      return result as ApiProvider[];
    } catch (error) {
      // If it's already an ApiKeyStorageError, re-throw it
      if (error instanceof ApiKeyStorageError) {
        throw error;
      }

      // Handle IPC errors
      if (error && typeof error === 'object' && 'message' in error) {
        throw new ApiKeyStorageError(error.message as string);
      }

      throw new ApiKeyStorageError('Failed to get stored provider IDs');
    }
  }

  /**
   * Gets display information for an API key (status and last four chars)
   *
   * This method retrieves information about whether a key is stored and its
   * last four characters without requiring full decryption. Useful for UI
   * display purposes.
   *
   * @param providerId The provider to get display info for
   * @returns An object with isStored and optionally lastFourChars
   * @throws ApiKeyStorageError if the operation fails
   */
  async getApiKeyDisplayInfo(
    providerId: ApiProvider
  ): Promise<{ isStored: boolean; lastFourChars?: string }> {
    try {
      const result = await this.bridge.getApiKeyDisplayInfo(providerId);
      return result;
    } catch (error) {
      // If it's already an ApiKeyStorageError, re-throw it
      if (error instanceof ApiKeyStorageError) {
        throw error;
      }

      // Handle IPC errors
      if (error && typeof error === 'object' && 'message' in error) {
        throw new ApiKeyStorageError(error.message as string);
      }

      throw new ApiKeyStorageError(
        `Failed to get API key display info for ${providerId}`
      );
    }
  }

  /**
   * Gets all available provider IDs (for UI listing)
   *
   * This is a synchronous operation that returns all providers that the system
   * supports, regardless of whether keys are stored for them.
   *
   * @returns Array of all available provider IDs
   */
  getAvailableProviders(): ApiProvider[] {
    return this.providerService.getAllProviderIds();
  }

  /**
   * Validates an API key format synchronously (for UI feedback)
   *
   * This provides immediate validation feedback in the UI without requiring
   * a round-trip to the main process. Useful for real-time form validation.
   *
   * @param providerId The provider to validate against
   * @param apiKey The API key to validate
   * @returns true if the API key has a valid format, false otherwise
   */
  validateApiKeyFormat(providerId: ApiProvider, apiKey: string): boolean {
    return this.providerService.validateApiKey(providerId, apiKey);
  }

  /**
   * Gets a provider validator instance (for advanced UI needs)
   *
   * @param providerId The provider to get the validator for
   * @returns The provider validator or undefined if not found
   */
  getProvider(providerId: ApiProvider) {
    return this.providerService.getProvider(providerId);
  }
}
