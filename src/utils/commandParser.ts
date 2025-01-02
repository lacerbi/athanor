// Extracts command blocks from XML-formatted clipboard input, preserving full XML for
// apply changes commands while extracting content for other command types.
export interface Command {
  type: string;
  content: string;
  fullContent?: string; // Stores complete XML for apply changes commands
}

function normalizeLineEndings(text: string): string {
  return text
    .replace(/\r\n/g, '\n') // Convert Windows line endings to Unix
    .replace(/\r/g, '\n'); // Convert old Mac line endings to Unix
}

// Extract all command blocks from the content
export function extractAllCommandBlocks(content: string): Command[] {
  const commands: Command[] = [];
  const normalizedContent = normalizeLineEndings(content);

  // Find all <ath command="xxx"> tags and their content
  const regex = /<ath\s+command="([^"]+)">([\s\S]*?)<\/ath>/g;
  let match;

  while ((match = regex.exec(normalizedContent)) !== null) {
    const [fullMatch, commandType, commandContent] = match;
    if (commandType && commandContent) {
      if (commandType === 'apply changes') {
        // For apply changes commands, preserve the full XML
        commands.push({
          type: commandType,
          content: commandContent.trim(),
          fullContent: fullMatch,
        });
      } else {
        commands.push({
          type: commandType,
          content: commandContent.trim(),
        });
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
