// src/llm/clients/gemini.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { BaseLLMClient } = require('./base-llm-client');
const Response = require('./response');  

// Define constants for Gemini's safety categories and thresholds
const HARM_CATEGORIES = {
  HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
  SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
  HARASSMENT: 'HARM_CATEGORY_HARASSMENT'
};

const HARM_BLOCK_THRESHOLDS = {
  UNSPECIFIED: 'HARM_BLOCK_THRESHOLD_UNSPECIFIED',
  BLOCK_LOW_AND_ABOVE: 'BLOCK_LOW_AND_ABOVE',
  BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE',
  BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH',
  BLOCK_NONE: 'BLOCK_NONE',
  OFF: 'OFF'
};

class GeminiClient extends BaseLLMClient {
  constructor(config) {
    super(config);
    const apiKey = this.getApiKey('gemini');
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Maps Gemini's finish reason to a standardized format
   * @private
   */
  _mapFinishReason(geminiReason) {
    const reasonMap = {
      'STOP': 'stop',
      'MAX_TOKENS': 'length',
      'SAFETY': 'content_filter',
      'RECITATION': 'content_filter',
      'PROHIBITED_CONTENT': 'content_filter',
      'SPII': 'content_filter',
      'BLOCKLIST': 'content_filter',
      'LANGUAGE': 'other',
      'OTHER': 'other',
      'MALFORMED_FUNCTION_CALL': 'function_call_error'
    };
    return reasonMap[geminiReason] || 'other';
  }  

  _createResponse(result) {
    const candidate = result.response.candidates[0];
    const content = candidate.content.parts[0].text;
    const usageMetadata = result.response.usageMetadata;
  
    const response = new Response({
      id: this._generateResponseId(),
      choices: [{
        finish_reason: this._mapFinishReason(candidate.finishReason),
        message: {
          role: 'assistant',
          content: content
        }
      }],
      created: Math.floor(Date.now() / 1000),
      model: result.response.modelVersion || this.model,
      provider: 'Google',
      usage: usageMetadata ? {
        prompt_tokens: usageMetadata.promptTokenCount,
        completion_tokens: usageMetadata.candidatesTokenCount,
        total_tokens: usageMetadata.totalTokenCount
      } : null
    });
    return response;  
  }

  async sendChat(system, messages) {
    try {
      this.validateMessages(messages);

    // Convert the generic safety settings to Gemini's format
    const safetySettings = this.safetySettings.map(setting => ({
      category: HARM_CATEGORIES[setting.category] || setting.category,
      threshold: HARM_BLOCK_THRESHOLDS[setting.threshold] || setting.threshold
    }));      

      const model = this.genAI.getGenerativeModel({ 
        model: this.model,
        systemInstruction: system,
        generationConfig: {
          maxOutputTokens: this.maxTokens,
          temperature: this.temperature
        },
        safetySettings
      });

      const chat = model.startChat({
        history: messages.slice(0, -1).map(msg => ({
          role: msg.role === 'assistant' ? 'model' : msg.role,
          parts: [{ text: msg.content }]
        }))
      });

      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessage(lastMessage.content);
      //console.log('Raw result from Gemini:', JSON.stringify(result, null, 2));

      return this._createResponse(result);

    } catch (error) {
      throw new Error(`Gemini API Error: ${error.message}`);
    }
  }
}

module.exports = GeminiClient;