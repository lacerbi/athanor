// AI Summary: Provides keyword extraction utilities for task description analysis.
// Core function: extractKeywords() - extracts meaningful keywords from text for context relevance scoring.
// Uses a comprehensive stop-word list to filter out noise, handles file paths, and normalizes punctuation.

import { BASE_STOPWORDS_SET } from './stopwords';

/**
 * Extracts meaningful keywords from a text string for context analysis.
 * This function tokenizes text, normalizes it, and filters out a comprehensive list of
 * common English and programming-related stop words.
 *
 * @param text The text to process.
 * @param extraStopWords An optional iterable of additional stop words to filter out for this specific call.
 * @returns An array of unique, lowercase keywords.
 */
export function extractKeywords(text: string, extraStopWords?: Iterable<string>): string[] {
  if (!text) return [];

  let stopWords = BASE_STOPWORDS_SET;
  if (extraStopWords) {
    // Create a new set for this call to avoid modifying the base set.
    // This is cheap and ensures purity.
    stopWords = new Set([...BASE_STOPWORDS_SET, ...extraStopWords]);
  }

  // Remove content within <example> and <examples> tags before processing
  const cleanedText = text.replace(/<(example|examples)>[\s\S]*?<\/\1>/gi, '');

  // Use more permissive regex to capture file paths, kebab-case, snake_case, and words
  const tokenRegex = /[\w./-]+/g;

  // Normalize backslashes to forward slashes before tokenization
  const normalizedText = cleanedText.replace(/\\/g, '/');

  const keywords =
    normalizedText
      .toLowerCase()
      .match(tokenRegex) // Extract tokens including file paths
      ?.map(word => word.replace(/[.,…]+$/, '')) // Remove trailing dots, commas, or ellipsis
      ?.filter(word => word.length > 0) // Remove empty strings that might result from replace
      ?.filter(word => !stopWords.has(word)) || []; // Filter out stop words

  return [...new Set(keywords)]; // Return unique keywords
}
