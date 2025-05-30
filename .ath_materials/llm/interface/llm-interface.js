// src/llm/interface/llm-interface.js
const { EventEmitter } = require('events');
const { MemoryManager } = require('./memory-manager');
const { BaseLLMClient } = require('../clients/base-llm-client')
const { 
  processPromptFile, 
  readAndFlattenRandomTags, 
  extractTextAndClean 
} = require('./prompt-utils');

class LLMInterfaceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LLMInterfaceError';
  }
}

/**
 * Interface for managing LLM interactions with memory and prompt processing
 * @typedef {Object} LLMInterfaceConfig
 * @property {BaseLLMClient|BaseLLMClient[]} [clients] - Single LLM client or array of clients in priority order
 * @property {number} [maxItemsPerRandomTag=30] - Max number of items when shuffling random tags
 * @property {Object} [memory] - Memory configuration
 * @property {number} [memory.numRecent=1] - Number of recent messages to include
 * @property {string} [memory.summaryType='full_minus_recent'] - Type of summary
 * @property {number} [memory.rollingWindow=5] - Number of messages for rolling summary
 */
class LLMInterface extends EventEmitter {
  /**
   * Default configuration values
   * @type {LLMInterfaceConfig}
   */
  static DEFAULT_CONFIG = {
    maxItemsPerRandomTag: 30,
    memory: {
      numRecent: 1,
      summaryType: 'full_minus_recent',
      rollingWindow: 5
    }
  };

  #clients;
  #memory;
  #turn;
  #config;

  /**
   * Creates a new LLMInterface instance
   * @param {LLMInterfaceConfig} [config={}] - Configuration options
   * @example
   * // Single client
   * const interface = new LLMInterface({ 
   *   client: new AnthropicClient({ ... }) 
   * });
   * 
   * // Multiple clients with fallback
   * const interface = new LLMInterface({ 
   *   clients: [
   *     new AnthropicClient({ ... }),
   *     new GeminiClient({ ... })
   *   ]
   * });
   */
  constructor(config = {}) {
    super();
    
    this.#config = {
      ...LLMInterface.DEFAULT_CONFIG,
      ...config,
      memory: {
        ...LLMInterface.DEFAULT_CONFIG.memory,
        ...(config.memory || {})
      },
    };

    // Support both 'client' and 'clients' config
    const { client, clients, ...restConfig } = this.#config;
    this.setClients(clients || client);
    
    this.#memory = new MemoryManager(this.#config.memory);
    this.#turn = 0;
  }

  /**
   * Add a user message to the chat history
   * @param {string} message - The user's message
   * @throws {LLMInterfaceError} If message is invalid
   */
  addUserMessage(message) {
    if (typeof message !== 'string' || !message.trim()) {
      //console.log('Error in User message:', JSON.stringify(message, null, 2));
      throw new LLMInterfaceError('Message must be a non-empty string');
    }

    this.#memory.addMessage({
      role: 'user',
      content: message.trim()
    });
    this.#turn += 1;
    this.emit('userMessageAdded', message);
  }

  /**
   * Adds an assistant message to the chat history.
   * Summaries can be added later using addMessageSummary().
   * 
   * @param {string} message - The assistant's message
   * @returns {number} timestamp - Unique timestamp identifier for the message
   * @throws {LLMInterfaceError} If message is invalid
   * @fires LLMInterface#assistantMessageAdded
   * 
   * @example
   * const timestamp = llmInterface.addAssistantMessage("I can help with that task");
   * // Later add a summary using the timestamp:
   * llmInterface.addMessageSummary(timestamp, "Offered assistance");
   * 
   * @see addMessageSummary
   */
  addAssistantMessage(message) {
    if (typeof message !== 'string' || !message.trim()) {
      //console.log('Error in Assistant message:', JSON.stringify(message, null, 2));
      throw new LLMInterfaceError('Message must be a non-empty string');
    }

    const timestamp = this.#memory.addMessage({
      role: 'assistant',
      content: message.trim()
    });
    
    /**
     * Assistant message added event.
     * @event LLMInterface#assistantMessageAdded
     * @type {object}
     * @property {string} message - The message content
     * @property {number} timestamp - Message timestamp for future reference
     */
    this.emit('assistantMessageAdded', { message: message.trim(), timestamp });
    
    return timestamp;
  }

  /**
   * Adds a summary for a previously added assistant message. This method allows
   * for delayed summary generation and addition, providing more flexibility in
   * summary management.
   * 
   * @param {number} timestamp - Timestamp identifier of the message to summarize
   * @param {string} summary - Summary of the message
   * @throws {LLMInterfaceError} If summary is invalid or message not found
   * @fires LLMInterface#summaryAdded
   * 
   * @example
   * const timestamp = llmInterface.addAssistantMessage("Let me explain the process...");
   * // Generate summary later
   * const summary = await generateSummary(message);
   * llmInterface.addMessageSummary(timestamp, summary);
   * 
   * @see addAssistantMessage
   */
  addMessageSummary(timestamp, summary) {
    // Validate inputs
    if (!Number.isInteger(timestamp)) {
      throw new LLMInterfaceError('Timestamp must be a valid integer');
    }
    if (typeof summary !== 'string' || !summary.trim()) {
      throw new LLMInterfaceError('Summary must be a non-empty string');
    }

    try {
      // Delegate to memory manager for actual summary storage
      this.#memory.addSummary(timestamp, summary.trim());
      
      /**
       * Summary added event.
       * @event LLMInterface#summaryAdded
       * @type {object}
       * @property {number} timestamp - Message timestamp
       * @property {string} summary - The summary content
       */
      this.emit('summaryAdded', { timestamp, summary: summary.trim() });
    } catch (error) {
      // Wrap memory manager errors in our interface error type
      throw new LLMInterfaceError(`Failed to add summary: ${error.message}`);
    }
  }

  /**
   * Retrieves the complete conversation history as an array of formatted messages.
   * Messages are returned in sequence, with user and assistant messages interleaved.
   * 
   * @returns {string[]} Array of formatted messages in the form "Role: content"
   * @throws {LLMInterfaceError} If there's an error accessing the message history
   * 
   * @example
   * const history = llmInterface.getFullHistory();
   * // Returns:
   * // [
   * //   "User: Hello, I need help",
   * //   "Assistant: I'll be happy to help",
   * //   "User: Can you explain...",
   * //   ...
   * // ]
   */
    getFullHistory() {
      try {
        const userMessages = this.#memory.userMessages;
        const assistantMessages = this.#memory.assistantMessages;
        const history = [];
        
        const maxLength = Math.max(userMessages.length, assistantMessages.length);
        for (let i = 0; i < maxLength; i++) {
          if (i < userMessages.length) {
            history.push(`User: ${userMessages[i].content}`);
          }
          if (i < assistantMessages.length) {
            history.push(`Assistant: ${assistantMessages[i].content}`);
          }
        }
        return history;
      } catch (error) {
        throw new LLMInterfaceError(`Failed to retrieve history: ${error.message}`);
      }
    }

  /**
   * Clears all conversation history and resets the turn counter.
   * This includes clearing all messages, summaries, and resetting internal state.
   * 
   * @fires LLMInterface#historyCleared
   * 
   * @example
   * llmInterface.clearHistory();
   * // All history is cleared and turn counter reset to 0
   */  
  clearHistory() {
    try {
      this.#turn = 0;
      this.#memory.clear();
      
      /**
       * History cleared event.
       * @event LLMInterface#historyCleared
       * @type {object}
       */
      this.emit('historyCleared');
    } catch (error) {
      throw new LLMInterfaceError(`Failed to clear history: ${error.message}`);
    }
  }

  /**
   * Set the LLM client(s)
   * @param {BaseLLMClient|BaseLLMClient[]} clientsInput - Single LLM client or array of clients in priority order
   */
  setClients(clientsInput) {
    // Handle both single client and array cases
    if (clientsInput instanceof BaseLLMClient) {
      this.#clients = [clientsInput];
      this.emit('clientsSet', this.#clients);
    } else if (Array.isArray(clientsInput)) {
      this.#clients = clientsInput;
      if (this.#clients.length > 0) {
        this.emit('clientsSet', this.#clients);
      }
    } else {
      this.#clients = [];
    }
  }

  /**
   * Set a single LLM client
   * @deprecated Use setClients instead
   * @param {BaseLLMClient} client - The LLM client to use
   */
  setClient(client) {
    this.setClients(client);
  }

  /**
   * Add a client to the end of the clients array
   * @param {BaseLLMClient} client - The LLM client to add
   */
  addClient(client) {
    if (client) {
      this.#clients.push(client);
      this.emit('clientAdded', client);
    }
  }  

  /**
   * Updates the memory configuration with new parameters.
   * 
   * @param {number} numRecent - Number of recent messages to include in context
   * @param {string} summaryType - Type of summary to generate ('none', 'full', 'full_minus_recent', 'rolling')
   * @throws {LLMInterfaceError} If parameters are invalid
   * @fires LLMInterface#memoryConfigUpdated
   * 
   * @example
   * llmInterface.setMemory(2, 'rolling');
   * // Updates memory to keep 2 recent messages and use rolling summaries
   */
  setMemory(numRecent, summaryType) {
    if (!Number.isInteger(numRecent) || numRecent < 0) {
      throw new LLMInterfaceError('numRecent must be a non-negative integer');
    }
    if (typeof summaryType !== 'string' || !summaryType.trim()) {
      throw new LLMInterfaceError('summaryType must be a non-empty string');
    }
  
    try {
      this.#config.memory.numRecent = numRecent;
      this.#config.memory.summaryType = summaryType.trim();
      this.#memory.updateConfig({
        numRecent,
        summaryType: summaryType.trim()
      });
  
      /**
       * Memory configuration updated event.
       * @event LLMInterface#memoryConfigUpdated
       * @type {object}
       * @property {number} numRecent - Updated number of recent messages
       * @property {string} summaryType - Updated summary type
       */
      this.emit('memoryConfigUpdated', { numRecent, summaryType: summaryType.trim() });
    } catch (error) {
      throw new LLMInterfaceError(`Failed to update memory configuration: ${error.message}`);
    }
  }

  /**
   * Returns a deep copy of the current configuration.
   * 
   * @returns {LLMInterfaceConfig} Current configuration object
   * 
   * @example
   * const config = llmInterface.getConfig();
   * console.log(config.memory.numRecent); // Access current memory settings
   */  
  getConfig() {
    return JSON.parse(JSON.stringify(this.#config)); // Deep copy to prevent mutation
  }

  /**
   * Gets the current memory manager instance.
   * 
   * @returns {MemoryManager} The current memory manager instance
   * 
   * @example
   * const memory = llmInterface.getMemory();
   * const memoryString = memory.getMemoryString();
   */  
  getMemory() {
    return this.#memory;
  }

  /**
   * Gets the current turn number in the conversation.
   * 
   * @returns {number} Current turn number
   * 
   * @example
   * const turn = llmInterface.getTurn();
   * console.log(`Current turn: ${turn}`);
   */
  getTurn() {
    return this.#turn;
  }

  /**
   * Updates the interface configuration with new values while preserving
   * unspecified values. Handles nested updates for memory configuration.
   * 
   * @param {Partial<LLMInterfaceConfig>} newConfig - Partial configuration object with updates
   * @fires LLMInterface#configUpdated
   * 
   * @example
   * llmInterface.updateConfig({
   *   maxItemsPerRandomTag: 50,
   *   memory: {
   *     numRecent: 3
   *   }
   * });
   */
  updateConfig(newConfig) {
    try {
      this.#config = {
        ...this.#config,
        memory: {
          ...this.#config.memory,
          ...(newConfig.memory || {})
        },
        ...newConfig
      };
      
      // Update memory manager if memory config changed
      if (newConfig.memory) {
        this.#memory.updateConfig(this.#config.memory);
      }
      
      /**
       * Configuration updated event.
       * @event LLMInterface#configUpdated
       * @type {object}
       * @property {LLMInterfaceConfig} config - Updated configuration
       */
      this.emit('configUpdated', this.getConfig()); // Send deep copy
    } catch (error) {
      throw new LLMInterfaceError(`Failed to update configuration: ${error.message}`);
    }
  }

  /**
   * Send a complex prompt to the LLM and process the response
   * @param {string} promptFilePath - Path to the prompt file
   * @param {Object} promptDict - Dictionary of prompt variables
   * @param {Object} [options] - Additional options
   * @param {boolean} [options.debug=false] - If true, return call dictionary without sending
   * @param {number} [options.temperature] - Override temperature for this call
   * @param {Function} [options.responseChecker] - Function to validate response
   *        Takes a string input and returns boolean. Throws error if response invalid.   
   * @returns {Promise<Object>} Response dictionary
   * @throws {LLMInterfaceError} If client is not set or other errors occur
  * 
  * @example
  * // Basic usage
  * const response = await llmInterface.sendPrompt(
  *   'prompts/analysis.txt',
  *   { variable: 'value' }
  * );
  * 
  * // With response validation and temperature
  * const response = await llmInterface.sendPrompt(
  *   'prompts/analysis.txt',
  *   { variable: 'value' },
  *   { 
  *     temperature: 0.7,
  *     responseChecker: (response) => response.includes('<output>')
  *   }
  * );
  * 
  * // Debug mode to inspect prompt without sending
  * const callDict = await llmInterface.sendPrompt(
  *   'prompts/analysis.txt',
  *   { variable: 'value' },
  *   { debug: true }
  * );
  */
  async sendPrompt(promptFilePath, promptDict, options = {}) {
    if (!this.#clients || this.#clients.length === 0) {
      throw new LLMInterfaceError('No LLM clients set');
    }

    const llmCallDict = {};
    promptDict.memory = this.#memory.getMemoryString();

    try {
      // Process random tags and prompt file
      const randomTagsDict = await readAndFlattenRandomTags(
        promptFilePath, 
        this.#config.maxItemsPerRandomTag
      );
      Object.assign(promptDict, randomTagsDict);

      const prompt = await processPromptFile(promptFilePath, promptDict);
      llmCallDict.system = prompt.system;

      const messages = this.#prepareMessages(prompt);
      llmCallDict.messages = messages;

      if (options.debug) {
        return llmCallDict;
      }

      // Try each client in sequence until one succeeds
      let lastError = null;
      for  (let i = 0; i < this.#clients.length; i++) {
        const client = this.#clients[i];
        const isLastClient = i === this.#clients.length - 1;

        try {
          // Handle temperature override for current client
          let oldTemperature;
          if (options.temperature != null) {
            oldTemperature = client.temperature;
            client.temperature = options.temperature;
          }

          try {
            // Send to current LLM client and get response
            const response = await client.sendChat(prompt.system, messages);

            // Verify response structure
            if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
              throw new Error('Invalid response structure from LLM client');
            }

            llmCallDict.output = response;
            const outputText = response.choices[0].message.content;

            // Extract thinking and response
            if (!outputText) {
              throw new Error('Empty response from LLM client');
            }
            const [aiThinking, aiResponse] = extractTextAndClean(outputText, 'thinking');        
            const responseText = aiResponse.trim();
            
            // Validate response if checker provided
            if (options.responseChecker) {
              if (typeof options.responseChecker !== 'function') {
                throw new LLMInterfaceError('responseChecker must be a function');
              }
              
              const isValid = options.responseChecker(responseText);
              if (!isValid) {
                throw new LLMInterfaceError('Response failed validation check');
              }
            }
            
            llmCallDict.response = responseText;
            llmCallDict.thinking = aiThinking ? aiThinking[0].trim() : '';

            return llmCallDict;

          } finally {
            // Restore original temperature if it was changed
            if (oldTemperature != null) {
              client.temperature = oldTemperature;
            }
          }

        } catch (error) {
          lastError = error;
          if (!isLastClient) {
            // Log warning if we have more clients to try
            console.warn(`Client failed, trying next one. Error: ${error.message}`);
          }
          continue;
        }
      }

      // If we get here, all clients failed
      throw new LLMInterfaceError(`All clients failed. Last error: ${lastError?.message}`);

    } catch (error) {
      throw new LLMInterfaceError(`Failed to send prompt: ${error.message}`);
    }
  }

  /**
   * Prepares and validates the sequence of user and assistant messages
   * @private
   * @param {Object} prompt - Processed prompt object containing message arrays
   * @param {string[]} [prompt.user=[]] - Array of user messages
   * @param {string[]} [prompt.assistant=[]] - Array of assistant messages
   * @returns {Array<{role: string, content: string}>} Alternating sequence of user and assistant messages
   * @throws {LLMInterfaceError} If messages don't alternate correctly between user and assistant
   * 
   * @example
   * // Internal usage:
   * const messages = this._prepareMessages({
   *   user: ['Hello'],
   *   assistant: ['Hi there']
   * });
   */
  #prepareMessages(prompt) {
    const userMessages = prompt.user || [];
    const assistantMessages = prompt.assistant || [];
  
    if (!Array.isArray(userMessages) || !Array.isArray(assistantMessages)) {
      throw new LLMInterfaceError('User and assistant messages must be arrays');
    }

    const messages = [];    
    const maxCount = Math.max(userMessages.length, assistantMessages.length);

    for (let msgCount = 0; msgCount < maxCount; msgCount++) {
      if (msgCount < userMessages.length) {
        const userMsg = userMessages[msgCount];
        if (userMsg?.trim() && !userMsg.includes('\\\\NONE\\\\')) {
          messages.push({ role: 'user', content: userMsg });
        }
      }
      if (msgCount < assistantMessages.length) {
        const asst_msg = assistantMessages[msgCount];
        if (asst_msg?.trim() && !asst_msg.includes('\\\\NONE\\\\')) {
          messages.push({ role: 'assistant', content: asst_msg });
        }
      }
    }

    const isValidSequence = messages.every((msg, idx) => {
      const expectedRole = idx % 2 === 0 ? 'user' : 'assistant';
      return (expectedRole === 'user' && ['user', 'human'].includes(msg.role)) ||
             (expectedRole === 'assistant' && ['assistant', 'model'].includes(msg.role));
    });

    if (!isValidSequence) {
      throw new LLMInterfaceError('User and assistant messages do not alternate correctly');
    }

    return messages;
  }

  toJSON() {
    return {
      turn: this.#turn,
      config: this.#config,
      memory: this.#memory.toJSON()
    };
  }

  fromJSON(data) {
    this.#turn = data.turn;
    this.updateConfig(data.config);
    this.#memory.fromJSON(data.memory);
  }
}

module.exports = {
  LLMInterface,
  LLMInterfaceError
};