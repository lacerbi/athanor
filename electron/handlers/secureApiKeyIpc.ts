// AI Summary: IPC handlers for secure API key operations bridging renderer to main process.
// Handles storage, retrieval, deletion, and status checking with proper error propagation.

import { ipcMain } from 'electron';
import { ApiKeyServiceMain } from '../modules/secure-api-storage/main';
import { IPCChannelNames, StoreApiKeyPayload, ApiKeyStorageError, InvokeApiCallPayload, InvokeApiCallResponse } from '../modules/secure-api-storage/common';

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

  // Get API key - REMOVED for security: plaintext keys should never be sent to renderer
  // The renderer process should use secure-api:invoke-call instead for API operations

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

  // Get API key display info
  ipcMain.handle(IPCChannelNames.SECURE_API_KEY_GET_DISPLAY_INFO, async (_event, providerId: string) => {
    try {
      return await apiKeyService.getApiKeyDisplayInfo(providerId as any);
    } catch (error) {
      if (error instanceof ApiKeyStorageError) {
        throw error;
      }
      throw new ApiKeyStorageError(`Failed to get API key display info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // Invoke secure API call
  ipcMain.handle(IPCChannelNames.SECURE_API_INVOKE_CALL, async (_event, payload: InvokeApiCallPayload): Promise<InvokeApiCallResponse> => {
    try {
      console.log(`Received secure API call request for ${payload.providerId}`);
      return await apiKeyService.invokeApiCall(payload);
    } catch (error) {
      console.error('Error invoking secure API call:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during API call invocation';
      
      // For security, don't expose detailed error information to renderer
      // if it might contain sensitive information
      if (error instanceof ApiKeyStorageError) {
        return {
          success: false,
          error: `API Key Storage Error: ${error.message}`,
          statusCode: 500
        };
      }
      
      return {
        success: false,
        error: `API call invocation failed: ${errorMessage}`,
        statusCode: 500
      };
    }
  });

  console.log('Secure API key IPC handlers registered');
}
