// AI Summary: Parses XML-based change commands and processes file operations for the Athanor system.
// Core function parseXmlContent() uses regex patterns to parse XML structure, validate content,
// and generate FileOperation objects. Handles CREATE, UPDATE_FULL, UPDATE_DIFF, and DELETE operations
// with comprehensive field validation and duplication checks.
import {
  FileOperation,
  FileOperationType,
} from '../../types/global';
import {
  processFileUpdate,
  normalizeLineEndings,
} from '../../utils/fileOperations';

// Regular expressions for parsing XML structure
const FILE_BLOCK_REGEX = /<file>([\s\S]*?)<\/file>/g;
const FIELD_REGEX = /<(file_message|file_operation|file_path|file_code)>([\s\S]*?)<\/\1>/gi;
const CDATA_REGEX = /<!\[CDATA\[([\s\S]*?)\]\]>/;
const ATH_COMMAND_REGEX = /<ath\s+command="apply changes">([\s\S]*?)<\/ath(?:\s+command(?:="[^"]*")?)?>/i;

interface ParsedFileBlock {
  file_message?: string;
  file_operation?: FileOperationType;
  file_path?: string;
  file_code?: string;
}

/**
 * Validates parsed block based on operation type and checks for duplicate fields
 */
function validateFileBlock(
  block: ParsedFileBlock,
  blockContent: string,
  addLog: (message: string) => void
): boolean {
  // Check for empty or undefined path
  if (!block.file_path?.trim()) {
    addLog('Invalid file block: empty or missing file path');
    return false;
  }

  // Check for duplicate fields
  const seenFields = new Set<string>();
  let match;
  FIELD_REGEX.lastIndex = 0;
  
  while ((match = FIELD_REGEX.exec(blockContent)) !== null) {
    const fieldName = match[1].toLowerCase();
    if (seenFields.has(fieldName)) {
      addLog(`Duplicate field found: ${fieldName} in file: ${block.file_path}`);
      return false;
    }
    seenFields.add(fieldName);
  }

  // Operation-specific validation
  switch (block.file_operation) {
    case 'CREATE':
    case 'UPDATE_FULL':
    case 'UPDATE_DIFF':
      if (!block.file_code) {
        addLog(`Missing file_code for ${block.file_operation} operation in: ${block.file_path}`);
        return false;
      }
      break;
    case 'DELETE':
      if (block.file_code && block.file_code.trim() !== '') {
        addLog(`DELETE operation should have empty file_code in: ${block.file_path}`);
        return false;
      }
      break;
    default:
      addLog(`Invalid or missing operation type in: ${block.file_path}`);
      return false;
  }

  return true;
}

/**
 * Parse an individual file block and extract its fields
 */
function parseFileBlock(blockContent: string, addLog: (message: string) => void): ParsedFileBlock | null {
  // Check for empty block
  if (!blockContent.trim()) {
    addLog('Empty file block found');
    return null;
  }

  const result: ParsedFileBlock = {};
  let match;

  // Reset regex state
  FIELD_REGEX.lastIndex = 0;
  
  while ((match = FIELD_REGEX.exec(blockContent)) !== null) {
    const [, fieldName, fieldContent] = match;
    const normalizedFieldName = fieldName.toLowerCase() as keyof ParsedFileBlock;

    if (!fieldContent.trim()) {
      addLog(`Empty content found for field: ${fieldName}`);
      return null;
    }

    // Handle CDATA sections in file_code
    if (normalizedFieldName === 'file_code') {
      const cdataMatch = CDATA_REGEX.exec(fieldContent);
      if (cdataMatch) {
        result[normalizedFieldName] = cdataMatch[1];
      } else {
        addLog('Warning: file_code missing CDATA section');
        result[normalizedFieldName] = fieldContent;
      }
    } else if (normalizedFieldName === 'file_operation') {
      const operation = fieldContent.trim();
      if (operation === 'CREATE' || operation === 'UPDATE_FULL' || 
          operation === 'UPDATE_DIFF' || operation === 'DELETE') {
        result[normalizedFieldName] = operation;
      } else {
        addLog(`Invalid operation type: ${operation}`);
        return null;
      }
    } else {
      result[normalizedFieldName] = fieldContent.trim();
    }
  }

  // Validate the complete block
  if (!validateFileBlock(result, blockContent, addLog)) {
    return null;
  }

  return result;
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
    let fileMatch;

    // Reset regex state
    FILE_BLOCK_REGEX.lastIndex = 0;

    // Process each file block
    while ((fileMatch = FILE_BLOCK_REGEX.exec(athContent)) !== null) {
      const blockContent = fileMatch[1];
      const parsedBlock = parseFileBlock(blockContent, addLog);

      if (!parsedBlock) {
        continue;
      }

      try {
        let oldCode = '';
        let processedNewCode = '';
        const operation = parsedBlock.file_operation as FileOperationType;
        const path = parsedBlock.file_path as string;

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
          processedNewCode = normalizeLineEndings(parsedBlock.file_code || '');
        } else if (operation === 'UPDATE_FULL' || operation === 'UPDATE_DIFF') {
          try {
            processedNewCode = await processFileUpdate(
              operation,
              path,
              parsedBlock.file_code || '',
              oldCode
            );
          } catch (error) {
            addLog(`Error processing update for ${path}: ${error}`);
            continue;
          }
        }

        operations.push({
          file_message: parsedBlock.file_message || '',
          file_operation: operation,
          file_path: path,
          new_code: processedNewCode,
          old_code: normalizeLineEndings(oldCode),
          accepted: false,
          rejected: false,
          diff_blocks: operation === 'UPDATE_DIFF' ? [] : undefined,
        });
      } catch (error) {
        console.error(`Error processing file ${parsedBlock.file_path}:`, error);
        addLog(`Failed to process file: ${parsedBlock.file_path} - ${error}`);
      }
    }

    return operations;
  } catch (error) {
    console.error('XML parsing error:', error);
    addLog('Failed to parse XML content');
    return operations;
  }
}
