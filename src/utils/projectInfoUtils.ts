// AI Summary: Handles finding and reading project information files from the project root or specific paths.
// Implements case-insensitive file search with specific basename and extension priorities.
// Supports both auto-discovery and settings-specified file paths with consistent content normalization.

import { PROJECT_INFO } from './constants';

/**
 * Normalize file content with consistent line endings
 * Reused from fileSystemService to ensure consistent handling
 * Optionally wrap the content in XML tags
 */
export function normalizeContent(content: string, wrapInXml: boolean = true): string {
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
 * Read project information from a specific file path relative to the project root.
 * This function is used when a specific file path is provided via settings.
 * 
 * @param basePath The root path of the project
 * @param relativePath The relative path to the project info file
 * @returns An object with the normalized content and absolute path of the file, or null if not found/invalid
 */
export async function readProjectInfoFromPath(basePath: string, relativePath: string): Promise<{ content: string; path: string } | null> {
  try {
    // Clean up the relative path
    const cleanPath = relativePath.trim().replace(/^[/\\]+/, ''); // Remove leading slashes
    
    if (!cleanPath) {
      console.warn('Empty project info file path provided');
      return null;
    }
    
    // Construct the full path
    const filePath = await window.fileSystem.joinPaths(basePath, cleanPath);
    
    // Check if the file exists
    const exists = await window.fileSystem.fileExists(filePath);
    if (!exists) {
      console.warn(`Project info file not found: ${filePath}`);
      return null;
    }
    
    // Check if it's a file (not a directory)
    const isDir = await window.fileSystem.isDirectory(filePath);
    if (isDir) {
      console.warn(`Project info path is a directory, not a file: ${filePath}`);
      return null;
    }
    
    // Read the file content
    const content = await window.fileSystem.readFile(filePath, {
      encoding: 'utf8',
    });
    
    if (typeof content !== 'string') {
      console.warn(`Project info file content is not text: ${filePath}`);
      return null;
    }
    
    // Normalize the content and return it along with the file path
    return {
      content: normalizeContent(content),
      path: filePath
    };
  } catch (error) {
    console.error(`Error reading project info from path: ${relativePath}`, error);
    return null;
  }
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
 * @returns An object with the normalized content and absolute path of the first matching file, or null if no file is found
 */
export async function readProjectInfo(basePath: string): Promise<{ content: string; path: string } | null> {
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
        
        try {
          const content = await window.fileSystem.readFile(filePath, {
            encoding: 'utf8',
          });
          
          if (typeof content !== 'string') {
            console.warn(`Project info file content is not text: ${filePath}`);
            continue; // Try next candidate
          }
          
          // Normalize the content and return it along with the file path
          return {
            content: normalizeContent(content),
            path: filePath
          };
        } catch (fileError) {
          console.warn(`Error reading project info file: ${filePath}`, fileError);
          continue; // Try next candidate
        }
      }
    }

    // No matching file found
    return null;
  } catch (error) {
    console.error('Error during project info auto-discovery:', error);
    return null;
  }
}
