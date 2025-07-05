// AI Summary: IPC handlers for LLM operations, routing requests between renderer and main process.
// Registers handlers for getting providers/models, sending messages to LLMs, and fetching presets.

import { ipcMain } from 'electron';
import type { LLMService, LLMChatRequest, ApiProviderId } from 'genai-lite';
import type { ApiKeyServiceMain } from 'genai-key-storage-lite';
import { LLM_IPC_CHANNELS } from '../../common/types/llm';

/**
 * Registers IPC handlers for LLM operations
 * 
 * @param llmService - The main process LLM service instance
 * @param apiKeyService - The API key service for checking key availability
 */
export function registerLlmIpc(llmService: LLMService, apiKeyService: ApiKeyServiceMain): void {
  console.log('Registering LLM IPC handlers');

  // Handler for getting supported providers
  ipcMain.handle(LLM_IPC_CHANNELS.GET_PROVIDERS, async () => {
    try {
      return await llmService.getProviders();
    } catch (error) {
      console.error('Error in GET_PROVIDERS handler:', error);
      throw error;
    }
  });

  // Handler for getting models for a specific provider
  ipcMain.handle(LLM_IPC_CHANNELS.GET_MODELS, async (event, providerId: ApiProviderId) => {
    try {
      return await llmService.getModels(providerId);
    } catch (error) {
      console.error('Error in GET_MODELS handler:', error);
      throw error;
    }
  });

  // Handler for sending messages to LLM providers
  ipcMain.handle(LLM_IPC_CHANNELS.SEND_MESSAGE, async (event, request: LLMChatRequest) => {
    try {
      return await llmService.sendMessage(request);
    } catch (error) {
      console.error('Error in SEND_MESSAGE handler:', error);
      throw error;
    }
  });

  // Handler for checking if an API key is available from any source
  ipcMain.handle(
    LLM_IPC_CHANNELS.IS_KEY_AVAILABLE,
    async (event, providerId: ApiProviderId): Promise<boolean> => {
      try {
        // First check if key exists in storage
        const hasStoredKey = await apiKeyService.withDecryptedKey(
          providerId as any,
          async () => true
        ).catch(() => false);
        
        if (hasStoredKey) {
          return true;
        }
        
        // Fall back to checking environment variables
        const envVarName = `ATHANOR_${providerId.toUpperCase()}_API_KEY`;
        const hasEnvKey = !!process.env[envVarName];
        
        return hasEnvKey;
      } catch (error) {
        console.error('Error in IS_KEY_AVAILABLE handler:', error);
        // Return false on error to prevent UI from assuming a key exists
        return false; 
      }
    }
  );

  // Handler for getting configured presets
  ipcMain.handle(LLM_IPC_CHANNELS.GET_PRESETS, async () => {
    try {
      return llmService.getPresets();
    } catch (error) {
      console.error('Error in GET_PRESETS handler:', error);
      throw error;
    }
  });

  console.log('LLM IPC handlers registered successfully');
}
