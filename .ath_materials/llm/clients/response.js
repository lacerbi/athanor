// src/llm/clients/response.js

/**
 * @typedef {Object} ResponseUsage
 * @property {number} prompt_tokens - Number of tokens in the prompt
 * @property {number} completion_tokens - Number of tokens in the completion
 * @property {number} total_tokens - Total number of tokens used
 */

/**
 * @typedef {Object} Message
 * @property {string} role - Role of the message sender (e.g., 'assistant')
 * @property {string|null} content - Content of the message
 */

/**
 * @typedef {Object} Choice
 * @property {string|null} finish_reason - Reason the generation finished
 * @property {Message} message - The generated message
 */

/**
 * Represents a standardized response from any LLM provider
 */
class Response {
    /**
     * @param {Object} params
     * @param {string} params.id - Unique identifier for the response
     * @param {Choice[]} params.choices - Array of choices from the model (assumed always max one)
     * @param {number} params.created - Unix timestamp of when the response was created
     * @param {string} params.model - Name of the model used
     * @param {string} params.provider - Name of the provider (e.g., 'Anthropic', 'OpenAI')
     * @param {ResponseUsage} [params.usage] - Token usage information
     */
    constructor({ id, choices, created, model, provider, usage }) {
      this.id = id;
      this.choices = choices;
      this.created = created;
      this.model = model;
      this.provider = provider;
      this.usage = usage;
      this.object = 'chat.completion';
    }
  }
  
  module.exports = Response;