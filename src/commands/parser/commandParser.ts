// AI Summary: Parses command blocks from XML-formatted clipboard input.
// Handles both single and multiple commands with proper content normalization.
// Supports escaped angle brackets specifically for ath command tags.
import { CommandType, COMMAND_TYPES } from '../types';

export interface Command {
  type: CommandType;
  content: string;
  fullContent?: string; // Stores complete XML for apply changes commands
}

function normalizeLineEndings(text: string): string {
  return text
    .replace(/\r\n/g, '\n') // Convert Windows line endings to Unix
    .replace(/\r/g, '\n'); // Convert old Mac line endings to Unix
}

/**
 * Unescapes angle brackets ONLY in potential Athanor command patterns
 * Targets escaped variants of <ath command="..."> and </ath> tags
 * Leaves other content untouched
 */
function unescapeAthCommandTags(text: string): string {
  // Handle opening ath command tags with various escape patterns
  // Matches: \<ath command="...">, &lt;ath command="...">, &amp;lt;ath command="...">
  const escapedOpenTagPattern =
    /(?:\\<|&lt;|&amp;lt;)ath\s+command="([^"]+)"(?:\\>|&gt;|&amp;gt;)/g;

  // Handle closing ath tags with various escape patterns
  // Matches: \</ath>, \</ath command="...">, &lt;/ath&gt;, etc.
  const escapedCloseTagPattern =
    /(?:\\<|&lt;|&amp;lt;)\/ath(?:\s+command(?:="[^"]*")?)?(?:\\>|&gt;|&amp;gt;)/g;

  // First replace opening tags
  let result = text.replace(escapedOpenTagPattern, (match, commandType) => {
    return `<ath command="${commandType}">`;
  });

  // Then replace closing tags
  result = result.replace(escapedCloseTagPattern, (match) => {
    // Simplify all closing variants to just </ath>
    return `</ath>`;
  });

  return result;
}

// Extract all command blocks from the content
export function extractAllCommandBlocks(content: string): Command[] {
  const commands: Command[] = [];

  // Only unescape the ath command tags, not the content within
  const processedContent = unescapeAthCommandTags(content);

  // Find all <ath command="xxx"> tags and their content
  const regex =
    /<ath\s+command="([^"]+)">([\s\S]*?)<\/ath(?:\s+command(?:="[^"]*")?)?>/g;
  let match;

  while ((match = regex.exec(processedContent)) !== null) {
    const [fullMatch, commandType, commandContent] = match;
    if (commandType && commandContent) {
      // Validate command type
      if (Object.values(COMMAND_TYPES).includes(commandType as CommandType)) {
        if (commandType === COMMAND_TYPES.APPLY_CHANGES) {
          // For apply changes commands, preserve the full XML
          commands.push({
            type: commandType as CommandType,
            content: commandContent.trim(),
            fullContent: fullMatch,
          });
        } else {
          commands.push({
            type: commandType as CommandType,
            content: commandContent.trim(),
          });
        }
      }
    }
  }

  return commands;
}

// Parse clipboard content for commands - supports both single and multiple commands
export function parseCommand(clipboardContent: string): Command[] | null {
  // Normalize line endings and trim content
  const normalizedContent = normalizeLineEndings(clipboardContent.trim());

  // Extract all commands from the content
  const commands = extractAllCommandBlocks(normalizedContent);

  // Return null if no valid commands found
  if (commands.length === 0) {
    return null;
  }

  return commands;
}
