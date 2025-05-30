// src/llm/interface/prompt-utils.js
const fs = require('fs');

/**
 * Processes prompt by: 
 * (1) replacing variables in the prompt content
 * (2) extracting tagged sections 'SYSTEM', 'USER', and 'ASSISTANT' from the prompt content.
 * 
 * @param {string} content - The raw content of the prompt file
 * @param {Object.<string, string>} varDict - Dictionary of variables to replace in the content
 * @param {string} varDict[key] - Value to replace {$KEY} in the content
 * @returns {{
 *   system: string,
 *   user: string[],
 *   assistant: string[]
 * }} Processed prompt sections
 * @throws {Error} If content processing fails or required sections are missing
 * 
 * @example
 * const content = `
 * <SYSTEM>Process {$ACTION} for user</SYSTEM>
 * <USER>Please help with task</USER>
 * <ASSISTANT>I'll help</ASSISTANT>
 * `;
 * 
 * const result = processPromptContent(content, { ACTION: 'request' });
 * // Returns:
 * // {
 * //   system: "Process request for user",
 * //   user: ["Please help with task"],
 * //   assistant: ["I'll help"]
 * // }
 */
function processPromptContent(content, varDict) {
  try {
    if (typeof content !== 'string') {
      throw new Error('Content must be a string');
    }

    // Replace variables
    let processedContent = content;
    if (varDict) {
      Object.entries(varDict).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\$${key.toUpperCase()}\\}`, 'g');
        processedContent = processedContent.replace(regex, String(value));
      });
    }

    // Extract sections
    const [systemContent] = extractTextAndClean(processedContent, 'SYSTEM');
    const [userContent] = extractTextAndClean(processedContent, 'USER');
    const [assistantContent] = extractTextAndClean(processedContent, 'ASSISTANT');

    return {
      system: systemContent?.[0]?.trim() ?? '',
      user: userContent?.map(text => text.trim()) ?? [],
      assistant: assistantContent?.map(text => text.trim()) ?? []
    };
  } catch (error) {
    throw new Error(`Failed to process prompt content: ${error.message}`);
  }
}


/**
 * Processes RANDOM_X tags from content and creates a flattened dictionary with 
 * numbered keys for each tag type. For each tag type, creates entries up to
 * maxPerTag, using empty strings for missing entries.
 * 
 * @param {string} content - Content containing RANDOM_X tags
 * @param {number} [maxPerTag=30] - Maximum number of examples to include per tag type
 * @returns {Object.<string, string>} Flattened dictionary where keys are 
 *          'random_x_1', 'random_x_2', etc. Each tag type will have exactly
 *          maxPerTag entries, using empty strings for missing content.
 * @throws {Error} If tag processing fails
 * 
 * @example
 * const content = `
 * <RANDOM_GREETING>Hello</RANDOM_GREETING>
 * <RANDOM_GREETING>Hi</RANDOM_GREETING>
 * <RANDOM_FAREWELL>Goodbye</RANDOM_FAREWELL>
 * `;
 * 
 * const result = flattenRandomTags(content, 2);
 * // Might return:
 * // {
 * //   random_greeting_1: "Hi",
 * //   random_greeting_2: "Hello",
 * //   random_farewell_1: "Goodbye",
 * //   random_farewell_2: ""
 * // }
 */
function flattenRandomTags(content, maxPerTag = 30) {
  try {
    const randomDict = extractRandomTags(content);
    const flattened = {};

    Object.entries(randomDict).forEach(([tag, contents]) => {
      const shuffled = [...contents].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < maxPerTag; i++) {
        const key = `random_${tag.toLowerCase()}_${i + 1}`;
        flattened[key] = i < shuffled.length ? shuffled[i] : '';
      }
    });

    return flattened;
  } catch (error) {
    throw new Error(`Failed to process random tags: ${error.message}`);
  }
}

/**
 * Extracts content from XML-style RANDOM_X tags and groups them by tag type.
 * Matches nested content using non-greedy matching.
 * 
 * @param {string} content - Content containing RANDOM_X tags
 * @returns {Object.<string, string[]>} Dictionary where keys are the X from RANDOM_X
 *          and values are arrays of content between those tags
 * 
 * @example
 * const content = `
 * <RANDOM_GREETING>Hello</RANDOM_GREETING>
 * <RANDOM_GREETING>Hi there</RANDOM_GREETING>
 * `;
 * 
 * const result = extractRandomTags(content);
 * // Returns:
 * // {
 * //   GREETING: ["Hello", "Hi there"]
 * // }
 */
function extractRandomTags(content) {
  if (typeof content !== 'string') {
    return {};
  }

  const randomDict = {};
  const pattern = /<RANDOM_(\w+)>([\s\S]*?)<\/RANDOM_\1>/g;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const [, tag, tagContent] = match;
    if (!randomDict[tag]) {
      randomDict[tag] = [];
    }
    randomDict[tag].push(tagContent);
  }

  return randomDict;
}

/**
 * Extracts text from specified XML-style tags and returns both the extracted content
 * and the original string with those sections removed. Handles multiple occurrences
 * of the same tag.
 * 
 * @param {string} xmlString - String containing XML-style tags to process
 * @param {string} tagName - Name of the tag to extract (without angle brackets)
 * @returns {[string[] | null, string]} Tuple containing:
 *          - Array of extracted content strings, or null if no matches
 *          - Original string with matched tags and content removed
 * 
 * @example
 * const input = `
 * <TAG>First</TAG>
 * Other content
 * <TAG>Second</TAG>
 * `;
 * 
 * const [extracted, cleaned] = extractTextAndClean(input, 'TAG');
 * // extracted = ["First", "Second"]
 * // cleaned = "\n Other content\n "
 */
function extractTextAndClean(xmlString, tagName) {
  if (typeof xmlString !== 'string' || typeof tagName !== 'string') {
    return [null, xmlString];
  }

  const matches = [];
  const pattern = new RegExp(`<${tagName}>([\\s\\S]*?)<\/${tagName}>`, 'g');
  let match;
  let lastIndex = 0;
  const segments = [];

  while ((match = pattern.exec(xmlString)) !== null) {
    if (lastIndex < match.index) {
      segments.push(xmlString.slice(lastIndex, match.index));
    }
    matches.push(match[1]);
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < xmlString.length) {
    segments.push(xmlString.slice(lastIndex));
  }

  return matches.length > 0 ? [matches, segments.join('')] : [null, xmlString];
}

/**
 * Extracts text between specified tags in the order provided, handling cases 
 * where closing tags may be missing. For each tag, content is extracted up to either:
 * 1. Its own closing tag, if present
 * 2. The start of the next tag in the sequence
 * 3. The end of the string (for the last tag)
 * 
 * @param {string} inputString - Input string containing tags to process
 * @param {string[]} tags - Array of tag names to extract, in processing order
 * @returns {Object.<string, string>} Dictionary with tag names as keys and
 *          extracted content as values
 * 
 * @example
 * // Works with properly closed tags:
 * const input1 = `
 * <first>Content 1</first>
 * <second>Content 2</second>
 * `;
 * 
 * // Also works with unclosed tags:
 * const input2 = `
 * <first>Content 1
 * <second>Content 2
 * <third>Content 3
 * `;
 * 
 * // Both produce the same result:
 * const result = extractTextBetweenTags(input2, ['first', 'second', 'third']);
 * // Returns:
 * // {
 * //   first: "Content 1",
 * //   second: "Content 2",
 * //   third: "Content 3"
 * // }
 */
function extractTextBetweenTags(inputString, tags) {
  const extracted = {};

  tags.forEach((currentTag, index) => {
    const nextTag = index < tags.length - 1 ? tags[index + 1] : '';
    
    const patternStr = nextTag
      ? `<${currentTag}>([\\s\\S]*?)(?:<\\/${currentTag}>|<${nextTag}>)`
      : `<${currentTag}>([\\s\\S]*?)(?:<\\/${currentTag}>|$)`;
    
    const pattern = new RegExp(patternStr, 'g');
    const match = pattern.exec(inputString);
    
    extracted[currentTag] = match ? match[1].trim() : '';
  });

  return extracted;
}

/**
 * Reads a prompt file and processes its content, replacing variables and
 * extracting tagged sections. Combines file reading with prompt processing.
 * 
 * @param {string} filePath - Path to the prompt file
 * @param {Object.<string, string>} varDict - Dictionary of variables to replace
 * @returns {{
 *   system: string,
 *   user: string[],
 *   assistant: string[]
 * }} Processed prompt sections
 * @throws {Error} If file cannot be read or content processing fails
 * 
 * @example
 * // For a file prompt.txt containing:
 * // <SYSTEM>Handle {$TYPE} request</SYSTEM>
 * // <USER>Help me</USER>
 * 
 * const result = processPromptFile('prompt.txt', { TYPE: 'user' });
 * // Returns:
 * // {
 * //   system: "Handle user request",
 * //   user: ["Help me"],
 * //   assistant: []
 * // }
 */
function processPromptFile(filePath, varDict) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return processPromptContent(content, varDict);
}

/**
 * Reads a file and processes its random tags, creating a flattened dictionary.
 * Combines file reading with random tag processing.
 * 
 * @param {string} filePath - Path to the prompt file
 * @param {number} [maxPerTag=30] - Maximum examples to include per tag type
 * @returns {Object.<string, string>} Flattened dictionary of random tag contents
 * @throws {Error} If file cannot be read or tag processing fails
 * 
 * @example
 * // For a file containing:
 * // <RANDOM_GREETING>Hello</RANDOM_GREETING>
 * // <RANDOM_GREETING>Hi</RANDOM_GREETING>
 * 
 * const result = readAndFlattenRandomTags('prompts.txt', 2);
 * // Might return:
 * // {
 * //   random_greeting_1: "Hi",
 * //   random_greeting_2: "Hello"
 * // }
 */
function readAndFlattenRandomTags(filePath, maxPerTag = 30) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return flattenRandomTags(content, maxPerTag);
}

module.exports = {
  // Core processing functions
  processPromptContent,
  flattenRandomTags,
  extractRandomTags,
  extractTextAndClean,
  extractTextBetweenTags,
  // File operation wrappers
  processPromptFile,
  readAndFlattenRandomTags
};