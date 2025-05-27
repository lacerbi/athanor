// AI Summary: IPC handlers for LLM operations, routing requests between renderer and main process.
// Registers handlers for getting providers/models and sending messages to LLMs.

import { ipcMain } from 'electron';
import type { LLMServiceMain } from '../modules/llm/main/LLMServiceMain';
import type { 
  LLMChatRequest, 
  ApiProviderId 
} from '../modules/llm/common/types';
import { LLM_IPC_CHANNELS } from '../modules/llm/common/types';

/**
 * Registers IPC handlers for LLM operations
 * 
 * @param llmService - The main process LLM service instance
 */
export function registerLlmIpc(llmService: LLMServiceMain): void {
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

  console.log('LLM IPC handlers registered successfully');
}
