// AI Summary: Utilities for processing and applying diff-based file updates.
// Handles initial empty line removal, search/replace block parsing, and validation.
// Provides functions for normalizing line endings and applying changes to file content.
import { DiffBlock } from '../types/global';

// Remove a single empty line at the start of content if present.
// Preserves lines containing whitespace characters.
export function removeInitialEmptyLine(content: string): string {
  if (!content) return '';
  
  // Check if content starts with a single newline
  if (content.startsWith('\n') && !content.startsWith('\n ') && !content.startsWith('\n\t')) {
    return content.slice(1);
  }
  
  return content;
}

// Parse diff blocks from file content
export function parseDiffBlocks(content: string): DiffBlock[] {
  const blocks: DiffBlock[] = [];
  const regex = /<<<<<<< SEARCH\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> REPLACE/g;
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    blocks.push({
      search: match[1],
      replace: match[2],
    });
  }
  
  return blocks;
}

// Validate that search blocks exist in the original content
export function validateSearchBlocks(
  originalContent: string,
  blocks: DiffBlock[]
): boolean {
  return blocks.every(({ search }) => originalContent.includes(search));
}

// Apply diff blocks to generate new content
export function applyDiffBlocks(
  originalContent: string,
  blocks: DiffBlock[]
): string {
  let newContent = originalContent;
  
  for (const { search, replace } of blocks) {
    // Ensure the search block exists in the content
    if (!newContent.includes(search)) {
      throw new Error(
        'Search block not found in file content. The file may have changed since the diff was generated.'
      );
    }
    
    // Replace the content
    newContent = newContent.replace(search, replace);
  }
  
  return removeInitialEmptyLine(newContent);
}

// Normalize line endings while preserving other whitespace
export function normalizeLineEndings(content: string): string {
  if (!content) return '';
  const normalized = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  return removeInitialEmptyLine(normalized);
}

// Process file update based on operation type
export async function processFileUpdate(
  operation: 'UPDATE_FULL' | 'UPDATE_DIFF',
  filePath: string,
  newCode: string,
  currentContent: string
): Promise<string> {
  // Normalize line endings in both contents
  const normalizedNewCode = normalizeLineEndings(newCode);
  const normalizedCurrentContent = normalizeLineEndings(currentContent);

  if (operation === 'UPDATE_FULL') {
    return normalizedNewCode;
  }

  // For diff updates, parse and apply the changes
  const diffBlocks = parseDiffBlocks(normalizedNewCode);
  
  if (!validateSearchBlocks(normalizedCurrentContent, diffBlocks)) {
    throw new Error(
      'One or more search blocks do not match the current file content'
    );
  }

  return applyDiffBlocks(normalizedCurrentContent, diffBlocks);
}
