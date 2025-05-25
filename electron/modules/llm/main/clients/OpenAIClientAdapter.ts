// AI Summary: OpenAI client adapter for making real API calls to OpenAI's chat completions endpoint.
// Handles request formatting, response parsing, and error mapping to standardized format.

import OpenAI from 'openai';
import type { LLMResponse, LLMFailureResponse } from '../../common/types';
import type { ILLMClientAdapter, InternalLLMChatRequest, AdapterErrorCode } from './types';
import { ADAPTER_ERROR_CODES } from './types';
import { getCommonMappedErrorDetails } from './adapterErrorUtils';

/**
 * Client adapter for OpenAI API integration
 * 
 * This adapter:
 * - Formats requests according to OpenAI's chat completions API
 * - Handles OpenAI-specific authentication and headers
 * - Maps OpenAI responses to standardized LLMResponse format
 * - Converts OpenAI errors to standardized LLMFailureResponse format
 */
export class OpenAIClientAdapter implements ILLMClientAdapter {
  private baseURL?: string;

  /**
   * Creates a new OpenAI client adapter
   * 
   * @param config Optional configuration for the adapter
   * @param config.baseURL Custom base URL for OpenAI-compatible APIs
   */
  constructor(config?: { baseURL?: string }) {
    this.baseURL = config?.baseURL;
  }

  /**
   * Sends a chat message to OpenAI's API
   * 
   * @param request - The internal LLM request with applied settings
   * @param apiKey - The decrypted OpenAI API key
   * @returns Promise resolving to success or failure response
   */
  async sendMessage(request: InternalLLMChatRequest, apiKey: string): Promise<LLMResponse | LLMFailureResponse> {
    try {
      // Initialize OpenAI client
      const openai = new OpenAI({ 
        apiKey,
        ...(this.baseURL && { baseURL: this.baseURL })
      });

      // Format messages for OpenAI API
      const messages = this.formatMessages(request);

      // Prepare API call parameters
      const completionParams: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
        model: request.modelId,
        messages: messages,
        temperature: request.settings.temperature,
        max_tokens: request.settings.maxTokens,
        top_p: request.settings.topP,
        ...(request.settings.stopSequences.length > 0 && { 
          stop: request.settings.stopSequences 
        }),
        ...(request.settings.frequencyPenalty !== 0 && {
          frequency_penalty: request.settings.frequencyPenalty
        }),
        ...(request.settings.presencePenalty !== 0 && {
          presence_penalty: request.settings.presencePenalty
        }),
        ...(request.settings.user && {
          user: request.settings.user
        })
      };

      console.log(`OpenAI API parameters:`, {
        model: completionParams.model,
        temperature: completionParams.temperature,
        max_tokens: completionParams.max_tokens,
        top_p: completionParams.top_p,
        hasStop: !!completionParams.stop,
        frequency_penalty: completionParams.frequency_penalty,
        presence_penalty: completionParams.presence_penalty,
        hasUser: !!completionParams.user
      });

      console.log(`Making OpenAI API call for model: ${request.modelId}`);

      // Make the API call
      const completion = await openai.chat.completions.create(completionParams);

      console.log(`OpenAI API call successful, response ID: ${completion.id}`);

      // Convert to standardized response format
      return this.createSuccessResponse(completion, request);

    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.createErrorResponse(error, request);
    }
  }

  /**
   * Validates OpenAI API key format
   * 
   * @param apiKey - The API key to validate
   * @returns True if the key format appears valid
   */
  validateApiKey(apiKey: string): boolean {
    // OpenAI API keys typically start with 'sk-' and are at least 20 characters
    return apiKey.startsWith('sk-') && apiKey.length >= 20;
  }

  /**
   * Gets adapter information
   */
  getAdapterInfo() {
    return {
      providerId: 'openai' as const,
      name: 'OpenAI Client Adapter',
      version: '1.0.0'
    };
  }

  /**
   * Formats messages for OpenAI API
   * 
   * @param request - The internal LLM request
   * @returns Formatted messages array for OpenAI
   */
  private formatMessages(request: InternalLLMChatRequest): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    // Add system message if provided
    if (request.systemMessage) {
      messages.push({
        role: 'system',
        content: request.systemMessage
      });
    }

    // Add conversation messages
    for (const message of request.messages) {
      if (message.role === 'system') {
        // Handle system messages in conversation
        messages.push({
          role: 'system',
          content: message.content
        });
      } else if (message.role === 'user') {
        messages.push({
          role: 'user',
          content: message.content
        });
      } else if (message.role === 'assistant') {
        messages.push({
          role: 'assistant',
          content: message.content
        });
      }
    }

    return messages;
  }

  /**
   * Creates a standardized success response from OpenAI's response
   * 
   * @param completion - Raw OpenAI completion response
   * @param request - Original request for context
   * @returns Standardized LLM response
   */
  private createSuccessResponse(
    completion: OpenAI.Chat.Completions.ChatCompletion, 
    request: InternalLLMChatRequest
  ): LLMResponse {
    const choice = completion.choices[0];
    
    if (!choice || !choice.message) {
      throw new Error('Invalid completion structure from OpenAI API');
    }

    return {
      id: completion.id,
      provider: request.providerId,
      model: completion.model || request.modelId,
      created: completion.created,
      choices: [{
        message: {
          role: choice.message.role as 'assistant',
          content: choice.message.content || ''
        },
        finish_reason: choice.finish_reason,
        index: choice.index
      }],
      usage: completion.usage ? {
        prompt_tokens: completion.usage.prompt_tokens,
        completion_tokens: completion.usage.completion_tokens,
        total_tokens: completion.usage.total_tokens
      } : undefined,
      object: 'chat.completion'
    };
  }

  /**
   * Creates a standardized error response from OpenAI errors
   * 
   * @param error - The error from OpenAI API
   * @param request - Original request for context
   * @returns Standardized LLM failure response
   */
  private createErrorResponse(error: any, request: InternalLLMChatRequest): LLMFailureResponse {
    // Use shared error mapping utility for common error patterns
    const initialProviderMessage = (error instanceof OpenAI.APIError) ? error.message : undefined;
    let { errorCode, errorMessage, errorType, status } = getCommonMappedErrorDetails(error, initialProviderMessage);

    // Apply OpenAI-specific refinements for 400 errors based on message content
    if (error instanceof OpenAI.APIError && status === 400) {
      if (error.message.toLowerCase().includes('context length')) {
        errorCode = ADAPTER_ERROR_CODES.CONTEXT_LENGTH_EXCEEDED;
      } else if (error.message.toLowerCase().includes('content policy')) {
        errorCode = ADAPTER_ERROR_CODES.CONTENT_FILTER;
        errorType = 'content_filter_error';
      }
      // For other 400 errors, use the default mapping from the utility (PROVIDER_ERROR)
    }

    return {
      provider: request.providerId,
      model: request.modelId,
      error: {
        message: errorMessage,
        code: errorCode,
        type: errorType,
        ...(status && { status }),
        providerError: error
      },
      object: 'error'
    };
  }
}
