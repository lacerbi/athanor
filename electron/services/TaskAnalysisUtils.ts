// AI Summary: Provides keyword extraction utilities for task description analysis.
// Core function: extractKeywords() - extracts meaningful keywords from text for context relevance scoring.
// Enhanced to handle file paths, normalize separators, and remove sentence punctuation.

/**
 * Extracts keywords from a text string for context analysis.
 * @param text The text to process.
 * @returns An array of unique, lowercase keywords.
 */
export function extractKeywords(text: string): string[] {
  if (!text) return [];

  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'in', 'it', 'of', 'for', 'on', 'with', 'to', 'and', 'or', 'this',
    'fix', 'update', 'change', 'add', 'remove', 'implement', 'refactor', 'style'
  ]);

  // Use more permissive regex to capture file paths and words
  const tokenRegex = /[\w./-]+/g;
  
  // Normalize backslashes to forward slashes before tokenization
  const normalizedText = text.replace(/\\/g, '/');
  
  const keywords = normalizedText
    .toLowerCase()
    .match(tokenRegex) // Extract tokens including file paths
    ?.map(word => word.replace(/\.+$/, '')) // Remove trailing dots (including ellipsis)
    ?.filter(word => word.length > 0) // Remove empty strings
    ?.filter(word => 
      word.length > 3 && 
      !stopWords.has(word) && 
      !word.includes('...') // Filter out ellipsis tokens
    ) || [];

  return [...new Set(keywords)]; // Return unique keywords
}
