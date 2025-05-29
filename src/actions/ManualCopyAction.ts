// AI Summary: Handles manual copy operations to clipboard with content formatting and token counting.
// Provides path-aware code block formatting with language detection.
// Integrates with application logging for operation tracking and error handling.
import { countTokens, formatTokenCount } from '../utils/tokenCount';
import { formatSingleFile } from '../utils/codebaseDocumentation';
import { useFileSystemStore } from '../stores/fileSystemStore';
import { generateCodebaseDocumentation } from '../utils/codebaseDocumentation';
import { DOC_FORMAT } from '../utils/constants';

export interface CopyParams {
  content: string;
  addLog: (message: string) => void;
  filePath?: string;
  rootPath?: string;
  isFormatted?: boolean;
  formatType?: string;
}

export interface CopySelectedParams {
  addLog: (message: string) => void;
  rootPath: string;
}

export interface CopyFailedDiffParams {
  filePaths: string[];
  addLog: (message: string) => void;
  rootPath: string;
}

// Normalize line endings while preserving other whitespace
function normalizeContent(content: string): string {
  if (!content) return '';
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export async function copySelectedFilesContent(
  params: CopySelectedParams
): Promise<void> {
  const { addLog, rootPath } = params;
  const { selectedItems, fileTree, formatType } =
    useFileSystemStore.getState();

  try {
    const { file_contents } = await generateCodebaseDocumentation(
      fileTree,
      selectedItems,
      rootPath,
      null,
      false, // Always exclude non-selected files for manual copy
      formatType // Use the format preference from the store
    );

    if (!file_contents) {
      addLog('No files selected to copy');
      return;
    }

    await navigator.clipboard.writeText(file_contents);
    const tokenCount = formatTokenCount(countTokens(file_contents));
    addLog(`Copied ${selectedItems.size} files to clipboard (${tokenCount})`);
  } catch (err) {
    addLog('Failed to copy selected files');
  }
}

export async function copyFailedDiffContent(
  params: CopyFailedDiffParams
): Promise<void> {
  const { filePaths, addLog, rootPath } = params;
  const { formatType } = useFileSystemStore.getState();

  try {
    // Gather content for each file
    const fileContents: string[] = [];

    for (const filePath of filePaths) {
      try {
        const content = (await window.fileSystem.readFile(filePath, {
          encoding: 'utf8',
        })) as string;
        fileContents.push(
          formatSingleFile(filePath, content, rootPath, false, formatType)
        );
      } catch (err) {
        console.error(`Error reading file ${filePath}:`, err);
        addLog(`Failed to read file: ${filePath}`);
        return;
      }
    }

    // Create final content block with message
    const contentBlock = [
      '# Failed UPDATE_DIFF Files',
      'The following files failed to apply UPDATE_DIFF operations. Please re-run the update diff with these current file contents:\n',
      ...fileContents,
      '\nPlease analyze these files and generate new UPDATE_DIFF blocks that will match the current content.',
    ].join('\n');

    await navigator.clipboard.writeText(contentBlock);
    const tokenCount = formatTokenCount(countTokens(contentBlock));
    addLog(`Copied ${filePaths.length} files to clipboard (${tokenCount})`);
  } catch (err) {
    console.error('Failed to copy failed diff content:', err);
    addLog('Failed to copy failed diff content');
  }
}

export async function copyToClipboard(params: CopyParams): Promise<void> {
  const {
    content,
    addLog,
    filePath,
    rootPath,
    isFormatted,
    formatType: providedFormatType,
  } = params;
  const storeFormatType = useFileSystemStore.getState().formatType;
  const formatType = providedFormatType || storeFormatType;

  try {
    let normalizedContent = normalizeContent(content);

    // If filePath is provided, format the content as a code block
    if (filePath) {
      normalizedContent = normalizeContent(
        formatSingleFile(filePath, content, rootPath, false, formatType)
      );
    }

    await navigator.clipboard.writeText(normalizedContent);
    const tokenCount = formatTokenCount(countTokens(normalizedContent));
    const messagePrefix = isFormatted ? 'Formatted content' : 'Content';
    addLog(`${messagePrefix} copied to clipboard (${tokenCount})`);
  } catch (err) {
    console.error('Failed to copy text:', err);
    addLog('Failed to copy to clipboard');
  }
}
