// src/llm/clients/anthropic.js
const Anthropic = require('@anthropic-ai/sdk');
const { BaseLLMClient } = require('./base-llm-client');
const Response = require('./response');  

class AnthropicClient extends BaseLLMClient {
  constructor(config) {
    super(config);
    const apiKey = this.getApiKey('anthropic');
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Maps Anthropic stop reasons to standardized format
   * @private
   */
  _mapStopReason(anthropicReason) {
    const reasonMap = {
      'end_turn': 'stop',
      'max_tokens': 'length',
      'stop_sequence': 'stop',
      'content_filter': 'content_filter',
      'tool_use' : 'tool_calls'
    };
    return reasonMap[anthropicReason] || 'other';
  }

  /**
   * Creates a standardized response from Anthropic's API response
   * @private
   * @param {Object} completion - Raw response from Anthropic API
   * @throws {Error} If completion structure is invalid
   */
  _createResponse(completion) {
    if (!completion || !completion.content || !completion.content[0]) {
      throw new Error('Invalid completion structure from Anthropic API');
    }

    // Map the usage data to our standardized format
    const usage = completion.usage ? {
      prompt_tokens: completion.usage.input_tokens,
      completion_tokens: completion.usage.output_tokens,
      total_tokens: completion.usage.input_tokens + completion.usage.output_tokens
    } : null;

    // Get created timestamp, fallback to current time if not available
    const created = completion.created_at 
      ? Math.floor(new Date(completion.created_at).getTime() / 1000)
      : Math.floor(Date.now() / 1000);

    return new Response({
      id: completion.id || this._generateResponseId(),
      choices: [{
        finish_reason: this._mapStopReason(completion.stop_reason),
        message: {
          role: completion.role,
          content: completion.content[0].text,
        }
      }],
      created,
      model: completion.model,
      provider: 'Anthropic',
      usage
    });
  }

  async sendChat(system, messages) {
    try {
      this.validateMessages(messages);

      // Convert messages to Anthropic's expected format
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: [{ type: 'text', text: msg.content }]
      }));

      const completion = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system: system,
        messages: formattedMessages
      });

      return this._createResponse(completion);
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new Error(`Anthropic API Error: ${error.message}`);
      }
      throw error;
    }
  }
}

module.exports = AnthropicClient;