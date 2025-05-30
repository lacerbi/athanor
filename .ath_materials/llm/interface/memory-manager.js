// src/llm/interface/memory-manager.js
/**
 * @fileoverview Generic conversation memory manager for LLM interactions.
 * Handles message storage, retrieval, and different summary strategies.
 * 
 * @module MemoryManager
 */

/** @enum {string} */
const SummaryType = {
  NONE: 'none',
  FULL: 'full',
  FULL_MINUS_RECENT: 'full_minus_recent',
  ROLLING: 'rolling'
};

/**
 * @typedef {Object} Message
 * @property {('user'|'assistant')} role - The role of the message sender
 * @property {string} content - The actual message content
 * @property {number} timestamp - Unix timestamp of when message was created
 */

/**
 * @typedef {Object} MemoryStrings
 * @property {string} [summaryRequest='Summarize our previous conversation.'] - Prompt for requesting summary
 * @property {string} [userTag='USER'] - Tag for user messages
 * @property {string} [assistantTag='ASSISTANT'] - Tag for assistant messages
 * @property {string} [summaryTag='summary'] - Tag for summary sections
 */

/**
 * @typedef {Object} MemoryConfig
 * @property {number} [numRecent=1] - Number of recent messages to include
 * @property {SummaryType} [summaryType=SummaryType.FULL_MINUS_RECENT] - Summary strategy
 * @property {number} [rollingWindow=5] - Number of messages to include in rolling summary
 * @property {MemoryStrings} [strings] - Customizable strings for memory formatting
 */

class MemoryManager {
    /**
     * Creates a new MemoryManager instance
     * 
     * @param {MemoryConfig} [config={}] - Configuration options
     */
    constructor(config = {}) {
      const defaultStrings = {
        summaryRequest: 'Summarize our previous conversation.',
        userTag: 'USER',
        assistantTag: 'ASSISTANT',
        summaryTag: 'summary'
      };

      this.config = {
        numRecent: config.numRecent ?? 1,
        summaryType: config.summaryType ?? SummaryType.FULL_MINUS_RECENT,
        rollingWindow: config.rollingWindow ?? 5,
        strings: {
          ...defaultStrings,
          ...(config.strings ?? {})
        }
      };

      this._validateConfig();
      
      this.userMessages = [];
      this.assistantMessages = [];
      this.summaries = new Map();  // key: message timestamp, value: summary
    }

    /**
     * Validates configuration values
     * @private
     * @throws {Error} If configuration is invalid
     */
    _validateConfig() {
      if (this.config.numRecent < 1) {
        throw new Error('numRecent must be at least 1');
      }
      if (this.config.rollingWindow < 1) {
        throw new Error('rollingWindow must be at least 1');
      }
      if (!Object.values(SummaryType).includes(this.config.summaryType)) {
        throw new Error(`Invalid summary type: ${this.config.summaryType}`);
      }
    }

    /**
     * Adds a new message to the conversation history
     * 
     * @param {Message} message - Message to add to history
     * @returns {number} Timestamp of added message
     */
    addMessage(message) {
      const timestamp = Date.now();
      const messageWithTimestamp = { ...message, timestamp };
      
      if (message.role === 'user') {
        this.userMessages.push(messageWithTimestamp);
      } else if (message.role === 'assistant') {
        this.assistantMessages.push(messageWithTimestamp);
      } else {
        throw new Error(`Invalid message role: ${message.role}`);
      }

      return timestamp;
    }

    /**
     * Adds a summary for a specific message
     * 
     * @param {number} timestamp - Timestamp of the message to summarize
     * @param {string} summary - Summary content
     */
    addSummary(timestamp, summary) {
      // Verify the message exists and is an assistant message
      const exists = this.assistantMessages.some(m => m.timestamp === timestamp);
      if (!exists) {
        throw new Error('Cannot add summary: message not found or not from assistant');
      }
      this.summaries.set(timestamp, summary);
    }

    /**
     * Formats a message with XML-style tags
     * 
     * @private
     * @param {Message} message - Message to format
     * @returns {string} Formatted message
     */
    _formatMessage(message) {
      const tag = message.role === 'user' ? 
        this.config.strings.userTag : 
        this.config.strings.assistantTag;
      
      return `\n<${tag}>\n${message.content}\n</${tag}>\n`;
    }

    /**
     * Gets summaries for the specified range of assistant messages
     * 
     * @private
     * @param {number} [startIdx] - Starting index
     * @param {number} [endIdx] - Ending index
     * @returns {string[]} Array of summaries
     */
    _getSummariesForRange(startIdx, endIdx) {
      return this.assistantMessages
        .slice(startIdx, endIdx)
        .map(message => this.summaries.get(message.timestamp))
        .filter(summary => summary !== undefined);
    }

    /**
     * Generates a formatted string containing conversation memory
     * 
     * @returns {string} Formatted memory string with summaries and recent messages
     */
    getMemoryString() {
      let memoryString = this._getSummaryString();
    
      // Get indices for recent messages
      const startUser = this.userMessages.length - this.config.numRecent;
      const startAssistant = this.assistantMessages.length - this.config.numRecent;
    
      // Add recent messages in sequence
      for (let i = 0; i < this.config.numRecent; i++) {
        if (startUser + i >= 0) {
          memoryString += this._formatMessage(this.userMessages[startUser + i]);
        }
        if (startAssistant + i >= 0) {
          memoryString += this._formatMessage(this.assistantMessages[startAssistant + i]);
        }
      }
    
      return memoryString;
    }

    /**
     * Generates a summary string based on the configured summary type
     * 
     * @private
     * @returns {string} Formatted summary string
     */
    _getSummaryString() {
      const { summaryType, numRecent, strings } = this.config;
      
      if (summaryType === SummaryType.NONE || !this.summaries.size) return '';
        
      // Get appropriate summaries based on type
      const summaries = (() => {
        switch (summaryType) {
          case SummaryType.FULL:
            return this._getSummariesForRange();
          case SummaryType.FULL_MINUS_RECENT:
            return this._getSummariesForRange(0, -numRecent);
          case SummaryType.ROLLING:
            return this._getSummariesForRange(
              -numRecent - this.config.rollingWindow, 
              -numRecent
            );
        }
      })();
  
      // Return empty string if no summaries returned
      if (!summaries.length) return '';
  
      // Add user request for summary
      let summaryStr = this._formatMessage({
        role: 'user',
        content: strings.summaryRequest,
        timestamp: Date.now()
      });
    
      // Add assistant response with summaries
      summaryStr += this._formatMessage({
        role: 'assistant',
        content: `<${strings.summaryTag}>\n${summaries.join('\n')}\n</${strings.summaryTag}>`,
        timestamp: Date.now()
      });
  
      return summaryStr;
    }

    /**
     * Clears all messages and summaries from memory
     */
    clear() {
      this.userMessages = [];
      this.assistantMessages = [];
      this.summaries.clear();
    }

    /**
     * Updates configuration with new values
     * 
     * @param {Partial<MemoryConfig>} newConfig - New configuration values
     */
    updateConfig(newConfig) {
      this.config = {
        ...this.config,
        ...newConfig,
        strings: newConfig.strings ? {
          ...this.config.strings,
          ...newConfig.strings
        } : this.config.strings
      };
      this._validateConfig();
    }

    /**
     * Serializes the manager state to a plain object
     * 
     * @returns {Object} Serialized state
     */
    toJSON() {
      return {
        config: this.config,
        userMessages: this.userMessages,
        assistantMessages: this.assistantMessages,
        summaries: Array.from(this.summaries.entries())
      };
    }

    /**
     * Restores manager state from a serialized object
     * 
     * @param {Object} data - Serialized state
     */
    fromJSON(data) {
      this.config = data.config;
      this.userMessages = data.userMessages;
      this.assistantMessages = data.assistantMessages;
      this.summaries = new Map(data.summaries);
      this._validateConfig();
    }
}

module.exports = { MemoryManager, SummaryType };