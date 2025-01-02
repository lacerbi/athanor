// AI Summary: Provides token counting functionality using js-tiktoken with efficient encoder caching.
// Handles edge cases like empty input and maintains singleton tokenizer instance.
// Includes formatting utilities for displaying token counts.
import { Tiktoken, encodingForModel } from 'js-tiktoken';

let tokenizer: Tiktoken | null = null;

// Initialize tokenizer with GPT-4 encoding (cl100k_base)
function getTokenizer(): Tiktoken {
  if (!tokenizer) {
    try {
      tokenizer = encodingForModel('gpt-4');
    } catch (error) {
      console.error('Failed to initialize tokenizer:', error);
      throw error; // Re-throw to be handled by the calling function
    }
  }
  return tokenizer;
}

export function countTokens(text: string): number {
  if (!text) {
    console.warn('Empty text passed to countTokens');
    return 0;
  }

  try {
    const enc = getTokenizer();
    if (!enc) {
      console.error('Failed to get tokenizer');
      return 0;
    }
    const tokens = enc.encode(text);
    return tokens.length;
  } catch (error) {
    console.error('Error counting tokens:', error);
    return 0;
  }
}

// Format token count with up to 3 significant digits as a regular number
export function formatTokenCount(count: number): string {
  if (count === 0) return '0 tokens';

  // Round to 3 significant digits
  const magnitude = Math.floor(Math.log10(count));
  const scale = Math.pow(10, magnitude - 2);
  const rounded = Math.ceil(count / scale) * scale;

  // Convert to string with comma formatting for thousands
  const formattedNumber = rounded.toLocaleString('en-US', {
    maximumFractionDigits: 0,
  });

  return `~${formattedNumber} tokens`;
}
