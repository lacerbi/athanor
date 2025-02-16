// AI Summary: Provides utility functions for reading file content and normalizing line endings.
// Also includes line counting logic for text files, used by file tree building and readFileByPath.

import { FILE_SYSTEM } from '../utils/constants';

// Normalize file content with consistent line endings
export function normalizeContent(content: string): string {
  return (
    content
      .replace(/\r\n/g, '\n') // Convert Windows line endings to Unix
      .replace(/\r/g, '\n')   // Convert old Mac line endings to Unix
      .split('\n')
      .map((line) => line.trimEnd()) // Remove trailing whitespace from each line
      .join('\n')
      .trim() + '\n'
  ); // Ensure single trailing newline
}

// Count lines in a file by reading and normalizing content
export async function countFileLines(path: string): Promise<number> {
  try {
    const rawContent = await window.fileSystem.readFile(path, {
      encoding: 'utf8',
    });
    const content = normalizeContent(rawContent as string);
    return content.split('\n').length;
  } catch (error) {
    console.error(`Error counting lines in file ${path}:`, error);
    return 0;
  }
}
