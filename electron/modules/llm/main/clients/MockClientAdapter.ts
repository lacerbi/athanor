// AI Summary: Mock client adapter for testing LLM functionality without making real API calls.
// Provides deterministic responses based on request content for development and testing.

import type { LLMResponse, LLMFailureResponse, ApiProviderId, LLMSettings } from '../../common/types';
import type { ILLMClientAdapter, InternalLLMChatRequest, AdapterErrorCode } from './types';
import { ADAPTER_ERROR_CODES } from './types';

/**
 * Mock client adapter for testing LLM functionality
 * 
 * This adapter simulates various LLM provider responses without making real API calls.
 * It's useful for:
 * - Testing the LLM service flow
 * - Development when API keys are not available
 * - Simulating error conditions
 * - Performance testing without API costs
 */
export class MockClientAdapter implements ILLMClientAdapter {
  private providerId: ApiProviderId;

  constructor(providerId: ApiProviderId = 'openai') {
    this.providerId = providerId;
  }

  /**
   * Sends a mock message response based on request content
   * 
   * @param request - The LLM request
   * @param apiKey - The API key (ignored for mock)
   * @returns Promise resolving to mock response
   */
  async sendMessage(request: InternalLLMChatRequest, apiKey: string): Promise<LLMResponse | LLMFailureResponse> {
    // Simulate network delay
    await this.simulateDelay(100, 500);

    try {
      // Check for special test patterns in the last user message
      const lastMessage = request.messages[request.messages.length - 1];
      const content = lastMessage?.content?.toLowerCase() || '';

      // Simulate various error conditions based on message content
      if (content.includes('error_invalid_key')) {
        return this.createErrorResponse('Invalid API key provided', ADAPTER_ERROR_CODES.INVALID_API_KEY, 401, request);
      }

      if (content.includes('error_rate_limit')) {
        return this.createErrorResponse('Rate limit exceeded', ADAPTER_ERROR_CODES.RATE_LIMIT_EXCEEDED, 429, request);
      }

      if (content.includes('error_credits')) {
        return this.createErrorResponse('Insufficient credits', ADAPTER_ERROR_CODES.INSUFFICIENT_CREDITS, 402, request);
      }

      if (content.includes('error_context_length')) {
        return this.createErrorResponse('Context length exceeded', ADAPTER_ERROR_CODES.CONTEXT_LENGTH_EXCEEDED, 400, request);
      }

      if (content.includes('error_model_not_found')) {
        return this.createErrorResponse('Model not found', ADAPTER_ERROR_CODES.MODEL_NOT_FOUND, 404, request);
      }

      if (content.includes('error_content_filter')) {
        return this.createErrorResponse('Content filtered due to policy violation', ADAPTER_ERROR_CODES.CONTENT_FILTER, 400, request);
      }

      if (content.includes('error_network')) {
        return this.createErrorResponse('Network connection failed', ADAPTER_ERROR_CODES.NETWORK_ERROR, 0, request);
      }

      if (content.includes('error_generic')) {
        return this.createErrorResponse('Generic provider error', ADAPTER_ERROR_CODES.PROVIDER_ERROR, 500, request);
      }

      // Generate successful mock response
      return this.createSuccessResponse(request, content);

    } catch (error) {
      return this.createErrorResponse(
        `Mock adapter error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ADAPTER_ERROR_CODES.UNKNOWN_ERROR,
        500,
        request
      );
    }
  }

  /**
   * Validates API key format (always returns true for mock)
   */
  validateApiKey(apiKey: string): boolean {
    return apiKey.length > 0;
  }

  /**
   * Gets adapter information
   */
  getAdapterInfo() {
    return {
      providerId: this.providerId,
      name: 'Mock Client Adapter',
      version: '1.0.0',
      supportedModels: ['mock-model-1', 'mock-model-2']
    };
  }

  /**
   * Creates a successful mock response
   */
  private createSuccessResponse(request: InternalLLMChatRequest, userContent: string): LLMResponse {
    // Generate response content based on user input and settings
    let responseContent: string;

    // Check for settings-based test patterns
    if (userContent.includes('test_temperature')) {
      responseContent = this.generateTemperatureTestResponse(request.settings.temperature);
    } else if (userContent.includes('test_settings')) {
      responseContent = this.generateSettingsTestResponse(request.settings);
    } else if (userContent.includes('hello') || userContent.includes('hi')) {
      responseContent = 'Hello! I\'m a mock LLM assistant. How can I help you today?';
    } else if (userContent.includes('weather')) {
      responseContent = 'I\'m a mock assistant and don\'t have access to real weather data, but I can pretend it\'s sunny and 72°F!';
    } else if (userContent.includes('code') || userContent.includes('programming')) {
      responseContent = 'Here\'s some mock code:\n\n```javascript\nfunction mockFunction() {\n  return "This is mock code!";\n}\n```';
    } else if (userContent.includes('long') || userContent.includes('detailed')) {
      responseContent = this.generateLongResponse();
    } else {
      responseContent = `You said: "${userContent}". This is a mock response from the ${this.providerId} mock adapter.`;
    }

    // Apply creativity based on temperature
    responseContent = this.applyTemperatureEffects(responseContent, request.settings.temperature);

    // Apply maxTokens constraint (rough simulation)
    const originalLength = responseContent.length;
    if (request.settings.maxTokens && request.settings.maxTokens < 200) {
      const words = responseContent.split(' ');
      const maxWords = Math.max(1, Math.floor(request.settings.maxTokens / 4));
      if (words.length > maxWords) {
        responseContent = words.slice(0, maxWords).join(' ') + '...';
      }
    }

    // Check for stop sequences
    if (request.settings.stopSequences.length > 0) {
      for (const stopSeq of request.settings.stopSequences) {
        const stopIndex = responseContent.indexOf(stopSeq);
        if (stopIndex !== -1) {
          responseContent = responseContent.substring(0, stopIndex);
          break;
        }
      }
    }

    const mockTokenCount = Math.floor(responseContent.length / 4); // Rough token estimation
    const promptTokenCount = Math.floor(request.messages.reduce((acc, msg) => acc + msg.content.length, 0) / 4);

    // Determine finish reason
    let finishReason = 'stop';
    if (originalLength > responseContent.length && request.settings.maxTokens && mockTokenCount >= request.settings.maxTokens) {
      finishReason = 'length';
    } else if (request.settings.stopSequences.some(seq => responseContent.includes(seq))) {
      finishReason = 'stop';
    }

    return {
      id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      provider: request.providerId,
      model: request.modelId,
      created: Math.floor(Date.now() / 1000),
      choices: [{
        message: {
          role: 'assistant',
          content: responseContent
        },
        finish_reason: finishReason,
        index: 0
      }],
      usage: {
        prompt_tokens: promptTokenCount,
        completion_tokens: mockTokenCount,
        total_tokens: promptTokenCount + mockTokenCount
      },
      object: 'chat.completion'
    };
  }

  /**
   * Generates a response that demonstrates temperature effects
   */
  private generateTemperatureTestResponse(temperature: number): string {
    if (temperature < 0.3) {
      return 'Low temperature setting detected. This response should be more deterministic and focused.';
    } else if (temperature > 0.8) {
      return 'High temperature setting detected! This response should be more creative, varied, and potentially surprising in its word choices and structure.';
    } else {
      return 'Moderate temperature setting detected. This response balances consistency with some creative variation.';
    }
  }

  /**
   * Generates a response that shows current settings
   */
  private generateSettingsTestResponse(settings: Required<LLMSettings>): string {
    return `Current mock settings:
- Temperature: ${settings.temperature}
- Max Tokens: ${settings.maxTokens}
- Top P: ${settings.topP}
- Stop Sequences: ${settings.stopSequences.length > 0 ? settings.stopSequences.join(', ') : 'none'}
- Frequency Penalty: ${settings.frequencyPenalty}
- Presence Penalty: ${settings.presencePenalty}
- User: ${settings.user || 'not set'}`;
  }

  /**
   * Applies mock temperature effects to response content
   */
  private applyTemperatureEffects(content: string, temperature: number): string {
    // At very low temperatures, make responses more formal
    if (temperature < 0.2) {
      return content.replace(/!/g, '.').replace(/\?/g, '.');
    }
    
    // At high temperatures, add some creative variations
    if (temperature > 0.8) {
      const variations = [
        content + ' 🎯',
        content + ' (with creative flair!)',
        '✨ ' + content,
        content + ' — quite interesting, isn\'t it?'
      ];
      return variations[Math.floor(Math.random() * variations.length)];
    }
    
    return content;
  }

  /**
   * Creates an error response
   */
  private createErrorResponse(
    message: string, 
    code: AdapterErrorCode, 
    status: number, 
    request: InternalLLMChatRequest
  ): LLMFailureResponse {
    return {
      provider: request.providerId,
      model: request.modelId,
      error: {
        message,
        code,
        type: this.getErrorType(code),
        ...(status > 0 && { status })
      },
      object: 'error'
    };
  }

  /**
   * Maps error codes to error types
   */
  private getErrorType(code: AdapterErrorCode): string {
    switch (code) {
      case ADAPTER_ERROR_CODES.INVALID_API_KEY:
        return 'authentication_error';
      case ADAPTER_ERROR_CODES.RATE_LIMIT_EXCEEDED:
      case ADAPTER_ERROR_CODES.INSUFFICIENT_CREDITS:
        return 'rate_limit_error';
      case ADAPTER_ERROR_CODES.MODEL_NOT_FOUND:
      case ADAPTER_ERROR_CODES.CONTEXT_LENGTH_EXCEEDED:
        return 'invalid_request_error';
      case ADAPTER_ERROR_CODES.CONTENT_FILTER:
        return 'content_filter_error';
      case ADAPTER_ERROR_CODES.NETWORK_ERROR:
        return 'connection_error';
      default:
        return 'server_error';
    }
  }

  /**
   * Generates a longer mock response for testing
   */
  private generateLongResponse(): string {
    return `This is a detailed mock response from the ${this.providerId} adapter. 
    
I can simulate various types of responses based on your input. Here are some features:

1. **Error Simulation**: Include phrases like "error_rate_limit" to test error handling
2. **Variable Length**: Request "long" responses to test token limits
3. **Code Generation**: Ask about "programming" to get mock code snippets
4. **Conversational**: Simple greetings work too

The mock adapter is useful for testing the LLM integration without making real API calls. It simulates realistic response times, token usage, and various error conditions that you might encounter with real LLM providers.

This response demonstrates how the adapter can generate longer content while still respecting the maxTokens parameter if specified in the request settings.`;
  }

  /**
   * Simulates network delay with random variation
   */
  private async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}
