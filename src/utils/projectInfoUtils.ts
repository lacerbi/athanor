// AI Summary: Handles finding and reading project information files from the project root.
// Implements case-insensitive file search with specific basename and extension priorities.
// Reuses normalizeContent from fileSystemService for consistent line ending handling.
import { PROJECT_INFO } from './constants';

/**
 * Normalize file content with consistent line endings
 * Reused from fileSystemService to ensure consistent handling
 * Optionally wrap the content in XML tags
 */
function normalizeContent(content: string, wrapInXml: boolean = true): string {
  // Normalize line endings and trim content
  const normalizedContent = content
    .replace(/\r\n/g, '\n') // Convert Windows line endings to Unix
    .replace(/\r/g, '\n') // Convert old Mac line endings to Unix
    .split('\n')
    .map((line) => line.trimEnd()) // Remove trailing whitespace from each line
    .join('\n')
    .trim();

  // Wrap in XML tags if requested
  if (wrapInXml) {
    return `<project_info>\n${normalizedContent}\n</project_info>\n`;
  }
  
  return normalizedContent + '\n'; // Ensure single trailing newline
}

/**
 * Read project information from a text file in the project root.
 * Searches for files in a specific priority order (case-insensitive):
 * 1. project.md, project.txt
 * 2. about.md, about.txt
 * 3. index.md, index.txt
 * 4. readme.md, readme.txt
 * 
 * @param basePath The root path of the project
 * @returns The normalized content of the first matching file, or null if no file is found
 */
export async function readProjectInfo(basePath: string): Promise<string | null> {
  try {
    // Read the directory entries once
    const entries = await window.fileSystem.readDirectory(basePath, false);
    
    // Convert entries to lowercase for case-insensitive matching
    const entriesLower = entries.map(entry => ({
      original: entry,
      lower: entry.toLowerCase()
    }));

    // Create candidate filenames from basenames and extensions
    const candidates = [];
    for (const basename of PROJECT_INFO.BASENAMES) {
      for (const ext of PROJECT_INFO.EXTENSIONS) {
        candidates.push(basename + ext);
      }
    }

    // Find the first matching file
    for (const candidate of candidates) {
      const match = entriesLower.find(entry => entry.lower === candidate.toLowerCase());
      if (match) {
        // Found a match - read the file using the original filename (preserving case)
        const filePath = await window.fileSystem.joinPaths(basePath, match.original);
        const content = await window.fileSystem.readFile(filePath, {
          encoding: 'utf8',
        });
        
        // Normalize the content and return it
        return normalizeContent(content as string);
      }
    }

    // No matching file found
    return null;
  } catch (error) {
    console.error('Error reading project info file:', error);
    return null;
  }
}
