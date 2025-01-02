// AI Summary: Handles parsing of XML commands from clipboard content.
// Validates XML structure, extracts command types and content with proper error handling.
// Provides functions for processing file operations and handling diff updates.
import { parseStringPromise } from 'xml2js';
import { FileOperation, FileOperationType, FileBlock, AthCommand } from '../types/global';
import { processFileUpdate, normalizeLineEndings } from '../utils/fileOperations';

export async function parseXmlContent(clipboardContent: string, addLog: (message: string) => void): Promise<FileOperation[]> {
  const operations: FileOperation[] = [];

  try {
    const result = await parseStringPromise(clipboardContent, {
      explicitArray: true,
      preserveChildrenOrder: true,
      explicitChildren: true,
      normalize: false,
      normalizeTags: true,
      trim: false,
    });

    if (!result.ath || !result.ath.file) {
      addLog('Invalid XML structure: missing ath or file elements');
      return operations;
    }

    const athCommand = result.ath as AthCommand;
    const fileBlocks = athCommand.file;

    for (const block of fileBlocks) {
      const message = block.file_message?.[0] || '';
      const operation = block.file_operation?.[0];
      const path = block.file_path?.[0] || '';
      const newCode = block.file_code?.[0] || '';

      if (!path || !operation) {
        addLog(`Skipping invalid file block: missing path or operation`);
        continue;
      }

      try {
        let oldCode = '';
        let processedNewCode = '';

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
          processedNewCode = normalizeLineEndings(newCode);
        } else if (
          operation === 'UPDATE_FULL' ||
          operation === 'UPDATE_DIFF'
        ) {
          try {
            processedNewCode = await processFileUpdate(
              operation,
              path,
              newCode,
              oldCode
            );
          } catch (error) {
            addLog(`Error processing update for ${path}: ${error}`);
            continue;
          }
        } else {
          addLog(`Unknown operation type: ${operation}`);
          continue;
        }

        operations.push({
          file_message: message,
          file_operation: operation,
          file_path: path,
          new_code: processedNewCode,
          old_code: normalizeLineEndings(oldCode),
          accepted: false,
          rejected: false,
          diff_blocks: operation === 'UPDATE_DIFF' ? [] : undefined,
        });
      } catch (error) {
        console.error(`Error processing file ${path}:`, error);
        addLog(`Failed to process file: ${path} - ${error}`);
      }
    }

    return operations;
  } catch (error) {
    console.error('XML parsing error:', error);
    addLog('Failed to parse XML content');
    return operations;
  }
}