// src/llm/clients/base-llm-client.js
const Response = require('./response');

/**
 * Custom error for validation failures
 */
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * @typedef {Object} SafetySetting
 * @property {string} category - The harm category to configure
 * @property {string} threshold - The threshold level for blocking content
 */

/**
 * Base class for LLM clients
 * Provides common functionality and interface that all LLM clients must implement
 */
class BaseLLMClient {
    /**
     * @param {Object} config - Configuration for the LLM client
     * @param {string} config.model - The full model name to use with the API
     * @param {number} config.maxTokens - Maximum number of tokens in the response
     * @param {number} config.temperature - Controls randomness in the response
     * @param {SafetySetting[]} [config.safetySettings] - Optional array of safety settings
     * @throws {ValidationError} If required configuration is missing or invalid
     */
    constructor(config) {
      if (!config || typeof config !== 'object') {
        throw new ValidationError('Configuration must be an object');
      }
      
      if (!config.model || typeof config.model !== 'string') {
        throw new ValidationError('Model name must be a non-empty string');
      }

      if (config.maxTokens != null && (!Number.isInteger(config.maxTokens) || config.maxTokens <= 0)) {
        throw new ValidationError('maxTokens must be a positive integer');
      }

      if (config.temperature != null && (typeof config.temperature !== 'number' || 
          config.temperature < 0 || config.temperature > 1)) {
        throw new ValidationError('temperature must be a number between 0 and 1');
      }

      // Validate safety settings if provided
      if (config.safetySettings !== undefined) {
        if (!Array.isArray(config.safetySettings)) {
          throw new ValidationError('safetySettings must be an array');
        }
        
        for (const [index, setting] of config.safetySettings.entries()) {
          if (!setting || typeof setting !== 'object') {
            throw new ValidationError(`Safety setting at index ${index} must be an object`);
          }
          if (!setting.category || !setting.threshold) {
            throw new ValidationError(
              `Safety setting at index ${index} must have category and threshold`
            );
          }
        }
      }      
      
      this.model = config.model;
      this.maxTokens = config.maxTokens;
      this.temperature = config.temperature;
      this.safetySettings = config.safetySettings || [];
    }
  
    /**
     * Retrieves an API key from environment variables
     * @param {string} serviceName - The name of the service
     * @returns {string} The API key
     * @throws {Error} If the API key is not found in environment variables
     */
    getApiKey(serviceName) {
      if (!serviceName || typeof serviceName !== 'string') {
        throw new Error('Service name must be a non-empty string');
      }
      
      const key = process.env[`${serviceName.toUpperCase()}_API_KEY`];
      if (!key) {
        throw new Error(`API key not found for service: ${serviceName}`);
      }
      return key;
    }
  
    /**
     * Validates the input messages format
     * @param {Array<{role: string, content: string}>} messages - The messages to validate
     * @throws {ValidationError} If the messages format is invalid
     */
    validateMessages(messages) {
      if (!Array.isArray(messages)) {
        throw new ValidationError('Messages must be an array');
      }
  
      for (const [index, message] of messages.entries()) {
        if (!message || typeof message !== 'object') {
          throw new ValidationError(`Message at index ${index} must be an object`);
        }
        
        if (!message.role || !message.content) {
          throw new ValidationError(`Message at index ${index} must have role and content`);
        }
        
        if (typeof message.role !== 'string' || typeof message.content !== 'string') {
          throw new ValidationError(`Message at index ${index} role and content must be strings`);
        }
      }
    }
  
    /**
     * Sends a chat message to the LLM
     * @param {string} system - The system message to set the context
     * @param {Array<{role: string, content: string}>} messages - The conversation history
     * @returns {Promise<string>} The LLM's response
     * @throws {Error} Must be implemented by subclass
     */
    async sendChat(system, messages) {
      throw new Error('Method sendChat() must be implemented by subclass');
    }

  /**
   * Creates a standardized Response object
   * @protected
   * @abstract
   * @param {*} rawResponse - The raw response from the provider's API
   * @returns {Response}
   */
  _createResponse(rawResponse) {
    throw new Error('Method _createResponse() must be implemented by subclass');
  }

  /**
   * Generates a unique ID for responses that don't provide one
   * @protected
   * @returns {string}
   */
  _generateResponseId() {
    return `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

}

module.exports = {
  BaseLLMClient,
  ValidationError
};