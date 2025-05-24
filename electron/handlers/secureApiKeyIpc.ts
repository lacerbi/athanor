// AI Summary: IPC handlers for secure API key operations bridging renderer to main process.
// Handles storage, retrieval, deletion, and status checking with proper error propagation.

import { ipcMain } from 'electron';
import { ApiKeyServiceMain } from '../modules/secure-api-storage/main';
import { IPCChannelNames, StoreApiKeyPayload, ApiKeyStorageError } from '../modules/secure-api-storage/common';

/**
 * Registers IPC handlers for secure API key operations
 * 
 * This function sets up all IPC communication channels between the renderer
 * and main process for API key management. All operations are delegated to
 * the ApiKeyServiceMain instance.
 * 
 * @param apiKeyService The main process API key service instance
 */
export function registerSecureApiKeyIpc(apiKeyService: ApiKeyServiceMain): void {
  // Store API key
  ipcMain.handle(IPCChannelNames.SECURE_API_KEY_STORE, async (_event, payload: StoreApiKeyPayload) => {
    try {
      await apiKeyService.storeKey(payload.providerId, payload.apiKey);
      return { success: true };
    } catch (error) {
      // Propagate ApiKeyStorageError with original message
      if (error instanceof ApiKeyStorageError) {
        throw error;
      }
      // Wrap other errors
      throw new ApiKeyStorageError(`Failed to store API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // Get API key
  ipcMain.handle(IPCChannelNames.SECURE_API_KEY_GET, async (_event, providerId: string) => {
    try {
      const apiKey = await apiKeyService.getKey(providerId as any);
      return apiKey || null;
    } catch (error) {
      if (error instanceof ApiKeyStorageError) {
        throw error;
      }
      throw new ApiKeyStorageError(`Failed to retrieve API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // Delete API key
  ipcMain.handle(IPCChannelNames.SECURE_API_KEY_DELETE, async (_event, providerId: string) => {
    try {
      await apiKeyService.deleteKey(providerId as any);
      return { success: true };
    } catch (error) {
      if (error instanceof ApiKeyStorageError) {
        throw error;
      }
      throw new ApiKeyStorageError(`Failed to delete API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // Check if API key is stored
  ipcMain.handle(IPCChannelNames.SECURE_API_KEY_IS_STORED, async (_event, providerId: string) => {
    try {
      return await apiKeyService.isKeyStored(providerId as any);
    } catch (error) {
      if (error instanceof ApiKeyStorageError) {
        throw error;
      }
      throw new ApiKeyStorageError(`Failed to check API key status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // Get stored provider IDs
  ipcMain.handle(IPCChannelNames.SECURE_API_KEY_GET_STORED_PROVIDERS, async (_event) => {
    try {
      return apiKeyService.getStoredProviderIds();
    } catch (error) {
      if (error instanceof ApiKeyStorageError) {
        throw error;
      }
      throw new ApiKeyStorageError(`Failed to get stored providers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  console.log('Secure API key IPC handlers registered');
}
