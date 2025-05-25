// AI Summary: Renderer process service for LLM operations, providing typed IPC communication with main process.
// Exposes LLM functionality to UI components through standardized async methods.

import { ipcRenderer } from 'electron';
import type { 
  LLMChatRequest, 
  LLMResponse, 
  LLMFailureResponse, 
  ProviderInfo, 
  ModelInfo,
  ApiProviderId 
} from '../common/types';
import { LLM_IPC_CHANNELS } from '../common/types';

/**
 * Renderer process service for LLM operations
 * 
 * This service provides a typed interface for UI components to:
 * - Get available LLM providers and models
 * - Send chat messages to LLM providers
 * - Handle responses and errors in a standardized way
 * 
 * All operations are performed via IPC communication with the main process.
 */
export class LLMServiceRenderer {
  /**
   * Gets list of supported LLM providers
   * 
   * @returns Promise resolving to array of provider information
   */
  async getProviders(): Promise<ProviderInfo[]> {
    try {
      return await ipcRenderer.invoke(LLM_IPC_CHANNELS.GET_PROVIDERS);
    } catch (error) {
      console.error('Error getting LLM providers:', error);
      return [];
    }
  }

  /**
   * Gets list of supported models for a specific provider
   * 
   * @param providerId - The provider ID to get models for
   * @returns Promise resolving to array of model information
   */
  async getModels(providerId: ApiProviderId): Promise<ModelInfo[]> {
    try {
      return await ipcRenderer.invoke(LLM_IPC_CHANNELS.GET_MODELS, providerId);
    } catch (error) {
      console.error(`Error getting models for provider ${providerId}:`, error);
      return [];
    }
  }

  /**
   * Sends a chat message to an LLM provider
   * 
   * @param request - The LLM chat request
   * @returns Promise resolving to either success or failure response
   */
  async sendMessage(request: LLMChatRequest): Promise<LLMResponse | LLMFailureResponse> {
    try {
      return await ipcRenderer.invoke(LLM_IPC_CHANNELS.SEND_MESSAGE, request);
    } catch (error) {
      console.error('Error sending LLM message:', error);
      
      // Return standardized error response
      return {
        provider: request.providerId,
        model: request.modelId,
        error: {
          message: error instanceof Error ? error.message : 'IPC communication error',
          code: 'IPC_ERROR',
          type: 'communication_error',
          providerError: error
        },
        object: 'error'
      };
    }
  }
}

// Export singleton instance for use in preload
export const llmServiceRenderer = new LLMServiceRenderer();
