// src/llm/clients/llm-clients-factory.js
const OpenAIClient = require('./openai');
const AnthropicClient = require('./anthropic');
const GeminiClient = require('./gemini');
const OpenRouterClient = require('./openrouter');
const { BaseLLMClient } = require('./base-llm-client');

/**
 * Configuration object for creating a client
 * @typedef {Object} ClientConfig
 * @property {string} model - The model identifier string (e.g., 'anthropic.haiku')
 * @property {Object} [config] - Optional configuration overrides
 * @property {number} [config.maxTokens] - Override default max tokens
 * @property {number} [config.temperature] - Override default temperature
 * @property {Object[]} [config.safetySettings] - Override default safety settings
 */

/**
 * Custom error for unsupported models or providers
 */
class UnsupportedModelError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsupportedModelError';
  }
}

class LLMFactory {
  // Default configuration values
  static DEFAULT_MAX_TOKENS = 2000;
  static DEFAULT_TEMPERATURE = 0.7;
  static DEFAULT_GEMINI_SAFETY_SETTINGS = [
    { category: 'HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
  ];

  // Static registry of provider-specific client classes
  static clientClasses = {
    'openai': OpenAIClient,
    'anthropic': AnthropicClient,
    'gemini': GeminiClient,
    'openrouter': OpenRouterClient,
  };

  // Static registry of model configurations and their full API model names
  static modelConfigs = {
    'anthropic.haiku': {
      apiModel: 'claude-3-haiku-20240307',
      maxTokens: LLMFactory.DEFAULT_MAX_TOKENS,
      temperature: LLMFactory.DEFAULT_TEMPERATURE
    },
    'anthropic.sonnet': {
      apiModel: 'claude-3.5-sonnet-20241022',
      maxTokens: LLMFactory.DEFAULT_MAX_TOKENS,
      temperature: LLMFactory.DEFAULT_TEMPERATURE
    },
    'openrouter.llama-3.1-8b': {
      apiModel: 'meta-llama/llama-3.1-8b-instruct',
      maxTokens: LLMFactory.DEFAULT_MAX_TOKENS,
      temperature: LLMFactory.DEFAULT_TEMPERATURE
    },
    'openrouter.llama-3.1-70b': {
      apiModel: 'meta-llama/llama-3.1-70b-instruct',
      maxTokens: LLMFactory.DEFAULT_MAX_TOKENS,
      temperature: LLMFactory.DEFAULT_TEMPERATURE
    },
    'openrouter.qwen-2.5-72b-instruct': {
        apiModel: 'qwen/qwen-2.5-72b-instruct',
        maxTokens: LLMFactory.DEFAULT_MAX_TOKENS,
        temperature: LLMFactory.DEFAULT_TEMPERATURE
      },
    'openrouter.haiku-beta': {
      apiModel: 'anthropic/claude-3-haiku:beta',
      maxTokens: LLMFactory.DEFAULT_MAX_TOKENS,
      temperature: LLMFactory.DEFAULT_TEMPERATURE
    },
    'gemini.flash': {
      apiModel: 'gemini-1.5-flash-002',
      maxTokens: LLMFactory.DEFAULT_MAX_TOKENS,
      temperature: LLMFactory.DEFAULT_TEMPERATURE,
      safetySettings: LLMFactory.DEFAULT_GEMINI_SAFETY_SETTINGS
    },
    'gemini.pro': {
      apiModel: 'gemini-1.5-pro-002',
      maxTokens: LLMFactory.DEFAULT_MAX_TOKENS,
      temperature: LLMFactory.DEFAULT_TEMPERATURE,
      safetySettings: LLMFactory.DEFAULT_GEMINI_SAFETY_SETTINGS
    },
    'openai.gpt4-mini': {
      apiModel: 'gpt-4o-mini',
      maxTokens: LLMFactory.DEFAULT_MAX_TOKENS,
      temperature: LLMFactory.DEFAULT_TEMPERATURE
    }
  };

  /**
   * Creates an LLM client instance based on the model string and configuration.
   * The factory determines the appropriate client class and configuration
   * based on the provided model string.
   * 
   * @param {string | ClientConfig} modelOrConfig - Either a model string (e.g., "anthropic.haiku") 
   *        or a complete ClientConfig object
   * @param {Object} [userConfig] - Optional configuration overrides (used only if first parameter is a string)
   * @returns {BaseLLMClient} An instance of the appropriate LLM client
   * @throws {UnsupportedModelError} If the provider or model is not supported
   * @throws {Error} If the model string format is invalid
   * 
   * @example
   * // Create with just a model string
   * const client1 = LLMFactory.createClient('anthropic.haiku');
   * 
   * // Create with string and separate config
   * const client2 = LLMFactory.createClient('openai.gpt4-mini', {
   *   temperature: 0.7,
   *   maxTokens: 1000
   * });
   * 
   * // Create with ClientConfig object
   * const client3 = LLMFactory.createClient({
   *   model: 'gemini.pro',
   *   config: {
   *     temperature: 0.9,
   *     safetySettings: [
   *       { category: 'HARM_CATEGORY_DANGEROUS', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
   *     ]
   *   }
   * });
   */
  static createClient(modelOrConfig, userConfig = {}) {
    let modelString;
    let config;

    // Handle both string and ClientConfig formats
    if (typeof modelOrConfig === 'string') {
      modelString = modelOrConfig;
      config = userConfig;
    } else if (typeof modelOrConfig === 'object' && modelOrConfig !== null) {
      modelString = modelOrConfig.model;
      config = modelOrConfig.config || {};
    } else {
      throw new Error('Invalid model specification. Expected string or ClientConfig object');
    }

    const [provider, modelKey] = modelString.split('.');
    
    if (!provider || !modelKey) {
      throw new Error('Invalid model string format. Expected "provider.model"');
    }

    const ClientClass = this.clientClasses[provider];
    if (!ClientClass) {
      throw new UnsupportedModelError(`Unsupported provider: ${provider}`);
    }

    const modelConfig = this.modelConfigs[modelString];
    if (!modelConfig) {
      throw new UnsupportedModelError(`Unsupported model: ${modelString}`);
    }

    const finalConfig = {
      model: modelConfig.apiModel,
      maxTokens: config.maxTokens ?? modelConfig.maxTokens,
      temperature: config.temperature ?? modelConfig.temperature,
      safetySettings: config.safetySettings ?? modelConfig.safetySettings,
      ...config  // Spread any other properties from config
    };

    return new ClientClass(finalConfig);
  }

  /**
   * Creates multiple LLM clients with their own configurations.
   * Clients are created in the order specified, which is important for fallback behavior.
   * 
   * @param {ClientConfig[]} modelConfigs - Array of model configurations
   * @returns {BaseLLMClient[]} Array of configured LLM clients
   * @throws {UnsupportedModelError} If any provider or model is not supported
   * @throws {Error} If any model string format is invalid
   * 
   * @example
   * // Create multiple clients with different configurations
   * const clients = LLMFactory.createClients([
   *   {
   *     model: 'anthropic.haiku',
   *     config: { 
   *       temperature: 0.7,
   *       maxTokens: 1000
   *     }
   *   },
   *   {
   *     model: 'gemini.pro',
   *     config: {
   *       temperature: 0.9,
   *       safetySettings: [
   *         { category: 'HARM_CATEGORY_DANGEROUS', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
   *       ]
   *     }
   *   },
   *   {
   *     // Fallback with default configuration
   *     model: 'openai.gpt4-mini'
   *   }
   * ]);
   * 
   * // These clients can then be used with LLMInterface for automatic fallback:
   * const interface = new LLMInterface({ clients });
   */
  static createClients(modelConfigs) {
    if (!Array.isArray(modelConfigs)) {
      throw new Error('modelConfigs must be an array of model configurations');
    }

    return modelConfigs.map(clientConfig => 
      LLMFactory.createClient(clientConfig)
    );
  }

  /**
   * Adds support for a new provider at runtime
   * @param {string} provider - The provider name (e.g., 'openai')
   * @param {typeof BaseLLMClient} clientClass - The client class to handle this provider
   * @throws {Error} If the provider is invalid or already registered
   */
  static addProvider(provider, clientClass) {
    if (!provider || typeof provider !== 'string') {
      throw new Error('Provider name must be a non-empty string');
    }
    if (this.clientClasses[provider]) {
      throw new Error(`Provider ${provider} is already registered`);
    }
    // Use BaseLLMClient from the proper import
    const isValidClient = clientClass.prototype instanceof BaseLLMClient;
    if (!isValidClient) {
      throw new Error('Client class must extend BaseLLMClient');
    }
    this.clientClasses[provider] = clientClass;
  }

  /**
   * Adds support for a new model at runtime
   * @param {string} modelString - The provider.model string (e.g., 'anthropic.haiku')
   * @param {string} apiModel - The full model name for API calls
   * @param {Object} [defaultConfig] - Default configuration for this model
   * @param {number} [defaultConfig.maxTokens] - Maximum tokens for this model
   * @param {number} [defaultConfig.temperature] - Temperature for this model
   * @throws {Error} If the model string is invalid or already registered
   */
  static addModel(modelString, apiModel, defaultConfig = {}) {
    if (!modelString || !modelString.includes('.')) {
      throw new Error('Invalid model string format. Expected "provider.model"');
    }
    if (this.modelConfigs[modelString]) {
      throw new Error(`Model ${modelString} is already registered`);
    }
    
    this.modelConfigs[modelString] = {
      apiModel,
      maxTokens: defaultConfig.maxTokens ?? this.DEFAULT_MAX_TOKENS,
      temperature: defaultConfig.temperature ?? this.DEFAULT_TEMPERATURE
    };
  }
}

module.exports = { 
  LLMFactory,
  UnsupportedModelError
};