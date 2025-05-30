// src/llm/clients/openrouter.js
const axios = require('axios');
const { BaseLLMClient } = require('./base-llm-client');
const Response = require('./response');  

class OpenRouterClient extends BaseLLMClient {
  // Class-level defaults
  static DEFAULT_SITE_NAME = 'llm-lite-js app';
  static DEFAULT_SITE_URL = '';

  constructor(config) {
    super(config);
    const apiKey = this.getApiKey('openrouter');
    
    // Get site info from env vars or fall back to defaults
    const siteUrl = process.env.OPENROUTER_SITE_URL || OpenRouterClient.DEFAULT_SITE_URL;
    const siteName = process.env.OPENROUTER_SITE_NAME || OpenRouterClient.DEFAULT_SITE_NAME;
    
    // Allow overrides via config object
    const finalSiteUrl = config.siteUrl || siteUrl;
    const finalSiteName = config.siteName || siteName;

    this.client = axios.create({
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': finalSiteUrl,
        'X-Title': finalSiteName
      }
    });
  }

  /**
   * Creates a standardized response from OpenRouter's API response
   * @private
   * @param {Object} response - Raw response from OpenRouter API
   * @returns {Response}
   */
  _createResponse(response) {
    if (!response || !response.choices || !response.choices[0]) {
      throw new Error('Invalid response structure from OpenRouter API');
    }

    const choice = response.choices[0];
    return new Response({
      id: response.id || this._generateResponseId(),
      choices: [{
        finish_reason: choice.finish_reason,
        message: {
          role: choice.message.role,
          content: choice.message.content
        }
      }],
      created: response.created,
      model: response.model,
      provider: response.provider,
      usage: response.usage ? {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens
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

      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages: fullMessages,
        max_tokens: this.maxTokens,
        temperature: this.temperature
      });
      
      return this._createResponse(response.data);
    } catch (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        throw new Error(`OpenRouter API Error: ${error.response.data.error?.message || error.message}`);
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error('No response received from OpenRouter API');
      } else {
        // Something happened in setting up the request that triggered an Error
        throw error;
      }
    }
  }
}

module.exports = OpenRouterClient;