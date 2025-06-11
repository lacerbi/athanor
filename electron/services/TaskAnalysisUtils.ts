// AI Summary: Provides keyword extraction utilities for task description analysis.
// Core function: extractKeywords() - extracts meaningful keywords from text for context relevance scoring.
// Uses a comprehensive stop-word list to filter out noise, handles file paths, and normalizes punctuation.

import { ALLOWED_SHORT_WORDS_SET, BASE_STOPWORDS_SET } from './wordFilters';

interface AnalyzedTaskDescription {
  pathMentions: Set<string>;
  keywords: string[];
}

/**
 * Analyzes a task description to separate path mentions from general keywords.
 * Path mentions are tokens that contain path separators or file extensions.
 * Keywords are filtered through stop-word lists and length requirements.
 *
 * @param text The task description text to analyze.
 * @returns An object containing separate sets of path mentions and keywords.
 */
export function analyzeTaskDescription(text: string): AnalyzedTaskDescription {
  if (!text) return { pathMentions: new Set(), keywords: [] };

  // Remove content within <example> and <examples> tags before processing
  const cleanedText = text.replace(/<(example|examples)>[\s\S]*?<\/\1>/gi, '');

  // Use more permissive regex to capture file paths, kebab-case, snake_case, and words
  const tokenRegex = /[\w./-]+/g;

  // Normalize backslashes to forward slashes before tokenization
  const normalizedText = cleanedText.replace(/\\/g, '/');

  const tokens = normalizedText
    .toLowerCase()
    .match(tokenRegex) // Extract tokens including file paths
    ?.map(word => word.replace(/[.,…]+$/, '')) // Remove trailing dots, commas, or ellipsis
    ?.filter(word => word.length > 0) || []; // Remove empty strings that might result from replace

  const pathMentions = new Set<string>();
  const potentialKeywords: string[] = [];

  // Separate tokens into path mentions and potential keywords
  for (const token of tokens) {
    // Filter out pure file extensions (like .js, .py, .json, .md)
    if (/^\.[a-z0-9]{1,5}$/i.test(token)) {
      continue; // Skip pure extensions
    }
    
    // Check if token looks like a path
    const isPath = token.includes('/') || token.includes('\\') || // Has path separators
                   /\.[a-z0-9]+$/i.test(token) || // Files with extensions (component.tsx, config.json)
                   /^\.[a-z][a-z0-9_-]+$/i.test(token); // Dot files like .gitignore, .prettierrc
    
    if (isPath) {
      pathMentions.add(token);
    } else {
      potentialKeywords.push(token);
    }
  }

  // Filter keywords using the existing logic
  const keywords = filterKeywords(potentialKeywords);

  return { pathMentions, keywords };
}

/**
 * Filters potential keywords using stop words and length requirements.
 * @param tokens Array of potential keyword tokens to filter.
 * @param extraStopWords Optional additional stop words to filter out.
 * @returns Array of filtered keywords.
 */
function filterKeywords(tokens: string[], extraStopWords?: Iterable<string>): string[] {
  let stopWords = BASE_STOPWORDS_SET;
  if (extraStopWords) {
    // Create a new set for this call to avoid modifying the base set.
    // This is cheap and ensures purity.
    stopWords = new Set([...BASE_STOPWORDS_SET, ...extraStopWords]);
  }

  const keywords = tokens
    .filter(word => !stopWords.has(word)) // Filter out stop words
    // Filter out short words unless they are in the allowed list
    .filter(word => word.length > 3 || ALLOWED_SHORT_WORDS_SET.has(word))
    // Filter out tokens that are just file extensions (e.g., .js, .docs)
    .filter(word => !/^\.[a-z0-9]{1,4}$/i.test(word));

  return [...new Set(keywords)]; // Return unique keywords
}

/**
 * @deprecated Use analyzeTaskDescription instead for relevance engine purposes.
 * Extracts meaningful keywords from a text string for context analysis.
 * This function tokenizes text, normalizes it, and filters out a comprehensive list of
 * common English and programming-related stop words.
 *
 * @param text The text to process.
 * @param extraStopWords An optional iterable of additional stop words to filter out for this specific call.
 * @returns An array of unique, lowercase keywords.
 */
export function extractKeywords(text: string, extraStopWords?: Iterable<string>): string[] {
  // Use the new analyzeTaskDescription and combine results for backward compatibility
  const { pathMentions, keywords } = analyzeTaskDescription(text);
  const allTokens = [...keywords, ...pathMentions];
  
  // Apply extra stop words if provided
  if (extraStopWords) {
    const extraStopWordsSet = new Set(extraStopWords);
    return allTokens.filter(token => !extraStopWordsSet.has(token));
  }
  
  return allTokens;
}
