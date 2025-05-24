// AI Summary: Utilities for processing and applying diff-based file updates.
// Handles initial empty line removal, search/replace block parsing, and supports both exact 
// and fuzzy patching with diff-match-patch library for robust file modifications.
import { DiffBlock } from '../types/global';
import { diff_match_patch } from 'diff-match-patch';

// Remove a single empty line at the start of content if present.
// Preserves lines containing whitespace characters.
export function removeInitialEmptyLine(content: string): string {
  if (!content) return '';

  // Check if content starts with a single newline
  if (
    content.startsWith('\n') &&
    !content.startsWith('\n ') &&
    !content.startsWith('\n\t')
  ) {
    return content.slice(1);
  }

  return content;
}

// Parse diff blocks from file content
export function parseDiffBlocks(content: string): DiffBlock[] {
  const blocks: DiffBlock[] = [];
  // Modified regex to properly handle optional punctuation after SEARCH and REPLACE
  // Allows one of [?<>!.,:;] immediately following the literal keyword
  const regex = /<<<<<<< SEARCH[?<>!.,:;]?\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> REPLACE[?<>!.,:;]?/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    // Validate that search content isn't empty
    if (!match[1].trim()) {
      throw new Error('Search block cannot be empty');
    }

    blocks.push({
      search: match[1],
      replace: match[2],
    });
  }

  if (blocks.length === 0) {
    throw new Error('No valid diff blocks found in content');
  }

  return blocks;
}

// Normalize line endings while preserving other whitespace
export function normalizeLineEndings(content: string): string {
  if (!content) return '';
  // First normalize line endings
  let normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Then replace non-breaking spaces with regular spaces
  normalized = normalized.replace(/\u00A0/g, ' ');
  return removeInitialEmptyLine(normalized);
}

// Process file update based on operation type
export async function processFileUpdate(
  operation: 'UPDATE_FULL' | 'UPDATE_DIFF',
  filePath: string,
  newCode: string,
  currentContent: string,
  diffMode: 'strict' | 'fuzzy' = 'fuzzy'
): Promise<string> {
  // Normalize line endings in both contents
  const normalizedNewCode = normalizeLineEndings(newCode);
  const normalizedCurrentContent = normalizeLineEndings(currentContent);

  if (operation === 'UPDATE_FULL') {
    return normalizedNewCode;
  }

  // For diff updates, parse and apply the changes
  const diffBlocks = parseDiffBlocks(normalizedNewCode);
  
  // Initialize DMP instance for potential fuzzy patching
  const dmp = new diff_match_patch();
  
  // Process each block sequentially, starting with original content
  let processedContent = normalizedCurrentContent;
  
  // Track blocks that failed exact match but succeeded with fuzzy patch
  const fuzzyMatchedBlocks: number[] = [];
  
  // Process each diff block
  for (let i = 0; i < diffBlocks.length; i++) {
    const block = diffBlocks[i];
    
    // Stage 1: Try exact match replacement first
    if (processedContent.includes(block.search)) {
      // Found exact match, perform simple replacement
      processedContent = processedContent.replace(block.search, block.replace);
      continue;
    }
    
    // If we're in strict mode and exact match fails, throw an error
    if (diffMode === 'strict') {
      throw new Error(
        `Strict matching failed for block ${i + 1} in ${filePath}. ` +
        `Exact string match not found. Search content beginning: ` +
        `"${block.search.substring(0, 50)}${block.search.length > 50 ? '...' : ''}"`
      );
    }
    
    // Stage 2: Exact match failed, try fuzzy patching (only in fuzzy mode)
    try {
      // Create a patch from the search and replace content
      const patches = dmp.patch_make(block.search, block.replace);
      
      // Apply the patch to the current processed content
      const [patchedContent, resultsArray] = dmp.patch_apply(patches, processedContent);
      
      // Check if all patches were applied successfully
      if (resultsArray.every(result => result === true)) {
        // Fuzzy patch was successful
        processedContent = patchedContent;
        fuzzyMatchedBlocks.push(i + 1); // Store 1-based index for more human-friendly reporting
      } else {
        // Some patches failed to apply
        const failedPatches = resultsArray
          .map((result, idx) => ({ idx, result }))
          .filter(item => !item.result)
          .map(item => item.idx + 1)
          .join(', ');
        
        throw new Error(
          `Both exact and fuzzy matching failed for block ${i + 1}. ` +
          `Fuzzy patches ${failedPatches} could not be applied cleanly. ` +
          `Search content beginning: "${block.search.substring(0, 50)}${block.search.length > 50 ? '...' : ''}"`
        );
      }
    } catch (patchError) {
      // Either patch creation or application failed
      throw new Error(
        `Failed to apply diff block ${i + 1} for ${filePath}: ` +
        `Exact match failed, and fuzzy patching error: ${patchError instanceof Error ? patchError.message : String(patchError)}`
      );
    }
  }
  
  // If we used fuzzy matching for any blocks, log the information
  if (fuzzyMatchedBlocks.length > 0) {
    console.info(
      `Applied fuzzy matching for blocks ${fuzzyMatchedBlocks.join(', ')} in ${filePath}`
    );
  }
  
  // Return the final processed content with any final cleanup
  return removeInitialEmptyLine(processedContent);
}
    