// src/llm/clients/openai.js
const OpenAI = require('openai');
const { BaseLLMClient } = require('./base-llm-client');  // Use destructuring
const Response = require('./response');  

class OpenAIClient extends BaseLLMClient {
  constructor(config) {
    super(config);
    const apiKey = this.getApiKey('openai');
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Creates a standardized response from OpenAI's API response
   * @private
   * @param {Object} completion - Raw response from OpenAI API
   * @throws {Error} If completion structure is invalid
   */
  _createResponse(completion) {
    if (!completion || !completion.choices || !completion.choices[0]) {
      throw new Error('Invalid completion structure from OpenAI API');
    }

    const choice = completion.choices[0];
    
    return new Response({
      id: completion.id,
      choices: [{
        finish_reason: choice.finish_reason,
        message: {
          role: choice.message.role,
          content: choice.message.content
        }
      }],
      created: completion.created,
      model: completion.model || this.model,  // Fallback to configured model if not in response
      provider: 'OpenAI',
      usage: completion.usage ? {
        prompt_tokens: completion.usage.prompt_tokens,
        completion_tokens: completion.usage.completion_tokens,
        total_tokens: completion.usage.total_tokens
      } : null
    });
  }

  async sendChat(system, messages) {
    try {
      this.validateMessages(messages);

      const fullMessages = [
        { role: 'system', content: system },
        ...messages
      ];

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: fullMessages,
        max_tokens: this.maxTokens,
        temperature: this.temperature
      });

      //console.log('Raw result from OpenAI:', JSON.stringify(completion, null, 2));

      const result = this._createResponse(completion)

      //console.log('Formatted response:', JSON.stringify(result, null, 2));

      return result;
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        throw new Error(`OpenAI API Error: ${error.message}`);
      }
      throw error;
    }
  }
}

module.exports = OpenAIClient;