// AI Summary: Provides robust sequential parsing of XML apply changes commands.
// Handles CDATA blocks and file operations with precise field validation and error handling.
// Core functions: parseXmlContent() sequentially processes file blocks and validates operations.
import { FileOperation, FileOperationType } from '../../types/global';
import {
  processFileUpdate,
  normalizeLineEndings,
} from '../../utils/fileOperations';

// Regex pattern for the outer ath command block
const ATH_COMMAND_REGEX =
  /<ath\s+command="apply\s*changes">([\s\S]*?)<\/ath(?:\s+command(?:="[^"]*")?)?>/i;

// Sequential parser to extract file blocks and their content
class XmlParser {
  private content: string;
  private position: number;

  constructor(content: string) {
    this.content = content;
    this.position = 0;
  }

  // Move position to next non-whitespace character
  private skipWhitespace(): void {
    while (
      this.position < this.content.length &&
      /\s/.test(this.content[this.position])
    ) {
      this.position++;
    }
  }

  // Find the next occurrence of a string from current position
  private findNext(search: string, errorContext: string): number {
    const pos = this.content.indexOf(search, this.position);
    if (pos === -1) {
      throw new Error(`Could not find ${errorContext}`);
    }
    return pos;
  }

  // Extract content between xml tags
  private extractTagContent(tagName: string): string {
    const startTag = `<${tagName}>`;
    const endTag = `</${tagName}>`;

    this.skipWhitespace();
    const startPos = this.findNext(startTag, `opening tag ${tagName}`);
    const contentStart = startPos + startTag.length;
    const endPos = this.findNext(endTag, `closing tag ${tagName}`);

    const content = this.content.slice(contentStart, endPos).trim();
    this.position = endPos + endTag.length;
    return content;
  }

  // Parse CDATA content within file_code block, with lenient handling of missing ]]>
  private parseCdataBlock(): string {
    const cdataStart = '<![CDATA[';

    this.skipWhitespace();
    const startPos = this.findNext(cdataStart, 'CDATA start marker');
    const contentStart = startPos + cdataStart.length;

    // At each position, check both for ]]> and </file_code>
    let searchPos = contentStart;
    while (searchPos < this.content.length) {
      // First check if we have a </file_code> at or before the next ]]>
      const fileCodeEnd = this.content.indexOf('</file_code>', searchPos);
      if (fileCodeEnd !== -1) {
        const nextCdataEnd = this.content.indexOf(']]>', searchPos);

        // If there's no ]]> or </file_code> comes first, try lenient parsing
        if (nextCdataEnd === -1 || fileCodeEnd < nextCdataEnd) {
          // Extract content up to the file_code closing tag
          const content = this.content.slice(contentStart, fileCodeEnd);

          // Look ahead for file closing tags, optionally followed by next block or command end
          const remaining = this.content.slice(fileCodeEnd);
          const closeTagsRegex = /^<\/file_code>\s*<\/file>(?:\s*(?:<file>\s*<file_message>|<\/ath(?:\s+command(?:="[^"]*")?)?>\s*)?)?/;
          const match = remaining.match(closeTagsRegex);

          if (match) {
            // We found a valid closing sequence
            this.position = fileCodeEnd + match[0].length;
            return content;
          }
        }
      }

      // Check for standard ]]> end marker
      const cdataEndPos = this.content.indexOf(']]>', searchPos);
      if (cdataEndPos !== -1) {
        let pos = cdataEndPos + ']]>'.length;
        const remaining = this.content.slice(pos);

        // Use regex to match closing tags with optional whitespace
        const closeTagsRegex = /^\s*<\/file_code>\s*<\/file>/;
        const match = remaining.match(closeTagsRegex);

        if (match) {
          // We found the proper closing sequence with ]]>
          const content = this.content.slice(contentStart, cdataEndPos);
          this.position = pos + match[0].length;
          return content;
        }

        // If no match, try next position
        searchPos = cdataEndPos + 3;
        continue;
      }

      // If we reach here, we found neither a valid ]]> nor a valid </file_code>
      throw new Error(
        'Could not find valid CDATA end marker (]]>) or file_code closing tag'
      );
    }

    throw new Error(
      'Reached end of content without finding valid CDATA ending'
    );
  }

  // Parse a single file block
  private parseFileBlock(): {
    message: string;
    operation: FileOperationType;
    path: string;
    code: string;
  } | null {
    try {
      this.skipWhitespace();

      // Check if we're at a file block
      if (this.content.indexOf('<file>', this.position) !== this.position) {
        return null;
      }
      this.position += '<file>'.length;

      // Extract required fields
      const message = this.extractTagContent('file_message');
      const operation = this.extractTagContent(
        'file_operation'
      ) as FileOperationType;
      const path = this.extractTagContent('file_path');

      // Find file_code opening tag
      this.skipWhitespace();
      const codeTagStart = this.findNext(
        '<file_code>',
        'file_code opening tag'
      );
      this.position = codeTagStart + '<file_code>'.length;

      // Parse CDATA block
      const code = this.parseCdataBlock();

      // Validate operation type
      const validOperations = [
        'CREATE',
        'UPDATE_FULL',
        'UPDATE_DIFF',
        'DELETE',
      ] as const;
      if (!validOperations.includes(operation)) {
        throw new Error(`Invalid operation type: ${operation}`);
      }

      // Validate required fields
      if (!path.trim()) {
        throw new Error('Empty or missing file path');
      }

      // Validate code content based on operation
      const isDELETE = (op: FileOperationType): op is 'DELETE' =>
        op === 'DELETE';

      if (isDELETE(operation)) {
        if (code.trim() !== '') {
          throw new Error('DELETE operation should have empty file_code');
        }
      } else if (!code) {
        throw new Error(`Missing file_code for ${operation} operation`);
      }

      return { message, operation, path, code };
    } catch (error) {
      throw new Error(
        `Error parsing file block: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Parse all file blocks
  public parseFileBlocks(): Array<{
    message: string;
    operation: FileOperationType;
    path: string;
    code: string;
  }> {
    const blocks = [];

    while (this.position < this.content.length) {
      this.skipWhitespace();

      // Check if we've reached the end of the ath block
      if (this.content.indexOf('</ath', this.position) === this.position) {
        break;
      }

      const block = this.parseFileBlock();
      if (!block) {
        break;
      }
      blocks.push(block);
    }

    return blocks;
  }
}

/**
 * Parse XML content and return array of file operations
 */
export async function parseXmlContent(
  clipboardContent: string,
  addLog: (message: string) => void
): Promise<FileOperation[]> {
  const operations: FileOperation[] = [];

  try {
    // Validate non-empty content
    if (!clipboardContent.trim()) {
      addLog('Empty content provided');
      return operations;
    }

    // Extract content between ath tags
    const athMatch = ATH_COMMAND_REGEX.exec(clipboardContent);
    if (!athMatch) {
      addLog('Invalid XML structure: missing or malformed ath command block');
      return operations;
    }

    const athContent = athMatch[1];
    const parser = new XmlParser(athContent);

    // Parse all file blocks
    const fileBlocks = parser.parseFileBlocks();

    // Process each file block
    for (const block of fileBlocks) {
      try {
        let oldCode = '';
        let processedNewCode = '';
        const operation = block.operation;
        const path = block.path;

        // Get existing file content if needed
        if (operation !== 'CREATE') {
          try {
            const isDir = await window.fileSystem.isDirectory(path);
            if (!isDir) {
              oldCode = (await window.fileSystem.readFile(path, {
                encoding: 'utf8',
              })) as string;
            } else {
              throw new Error(`Path is a directory: ${path}`);
            }
          } catch (error) {
            if (operation !== 'DELETE') {
              throw error;
            }
            oldCode = '';
          }
        }

        // Process the new code based on operation type
        if (operation === 'DELETE') {
          processedNewCode = '';
        } else if (operation === 'CREATE') {
          processedNewCode = normalizeLineEndings(block.code);
        } else if (operation === 'UPDATE_FULL' || operation === 'UPDATE_DIFF') {
          try {
            processedNewCode = await processFileUpdate(
              operation,
              path,
              block.code,
              oldCode
            );
          } catch (error) {
            addLog(`Error processing update for ${path}: ${error}`);
            continue;
          }
        }

        operations.push({
          file_message: block.message,
          file_operation: operation,
          file_path: path,
          new_code: processedNewCode,
          old_code: normalizeLineEndings(oldCode),
          accepted: false,
          rejected: false,
          diff_blocks: operation === 'UPDATE_DIFF' ? [] : undefined,
        });
      } catch (error) {
        console.error(`Error processing file ${block.path}:`, error);
        addLog(`Failed to process file: ${block.path} - ${error}`);
      }
    }

    return operations;
  } catch (error) {
    console.error('XML parsing error:', error);
    addLog('Failed to parse XML content');
    return operations;
  }
}
