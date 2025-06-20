// AI Summary: Provides utility functions for prompt construction, specifically token counting
// and smart content previewing, for use within the main process.

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

// Smart content preview for non-selected files
export function getSmartPreview(content: string, config: { minLines: number; maxLines: number }): string {
  const lines = content.split('\n');

  // If the file is not longer than maxLines, return it in full
  if (lines.length <= config.maxLines) {
    return content;
  }

  // Always show at least minLines
  let endLine = config.minLines;
  let emptyLinesCount = lines
    .slice(0, config.minLines)
    .filter((line) => line.trim() === '').length;

  // If we haven't found at least two empty lines, keep looking up to maxLines
  if (emptyLinesCount < 2 && lines.length > config.minLines) {
    for (
      let i = config.minLines;
      i < Math.min(lines.length, config.maxLines);
      i++
    ) {
      if (lines[i].trim() === '') {
        endLine = i + 1; // Include the empty line
        break;
      }
      endLine = i + 1;
    }
  }

  return lines.slice(0, endLine).join('\n') + '\n... (content truncated)';
}
