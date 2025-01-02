// AI Summary: Handles manual copy operations to clipboard with content formatting and token counting.
// Provides path-aware code block formatting with language detection.
// Integrates with application logging for operation tracking and error handling.
import { countTokens, formatTokenCount } from '../utils/tokenCount';
import { formatSingleFile } from '../utils/codebaseDocumentation';

export interface CopyParams {
  content: string;
  addLog: (message: string) => void;
  filePath?: string;
  rootPath?: string;
  isFormatted?: boolean;
}

// Normalize line endings while preserving other whitespace
function normalizeContent(content: string): string {
  if (!content) return '';
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export async function copyToClipboard(params: CopyParams): Promise<void> {
  const { content, addLog, filePath, rootPath, isFormatted } = params;

  try {
    let normalizedContent = normalizeContent(content);
    
    // If filePath is provided, format the content as a code block
    if (filePath && content) {
      normalizedContent = normalizeContent(
        formatSingleFile(filePath, content, rootPath)
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
