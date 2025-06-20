// AI Summary: A stateless utility for fast, regex-based dependency scanning.
// Supports multiple languages by mapping file extensions to language-specific regex patterns.
// Designed for high-performance analysis without building a full AST.

import * as path from 'path';

// Regex patterns for different languages. They aim to capture the module specifier.
const dependencyRegex = {
  // JavaScript, TypeScript (import/export from, require, dynamic import)
  javascript: [
    /(?:import|export)(?:[\s\S]*?)(?:from\s*)?['"]([^'"]+)['"]/g,
    /require\(['"]([^'"]+)['"]\)/g,
    /import\(['"]([^'"]+)['"]\)/g,
  ],
  // Python (import ..., from ... import ...)
  python: [
    /^import\s+([\w.]+)/gm,
    /^from\s+([.\w]+)\s+import\s+/gm,
  ],
  // CSS, SCSS, Less (@import)
  css: [
    /@import\s+(?:url\()?['"]([^'"]+)['"]/g,
  ],
  // Add other languages here
};

// Maps file extensions to language identifiers in dependencyRegex
const extensionToLanguageMap: Record<string, keyof typeof dependencyRegex> = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'javascript',
  '.tsx': 'javascript',
  '.d.ts': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.vue': 'javascript',
  '.svelte': 'javascript',
  '.py': 'python',
  '.css': 'css',
  '.scss': 'css',
  '.less': 'css',
};

export class DependencyScanner {
  /**
   * Scans a file's content for dependencies using regex based on its extension.
   * @param filePath The path to the file, used to determine the language.
   * @param fileContent The content of the file to scan.
   * @returns An array of unique dependency specifiers found in the file.
   */
  public static scan(filePath: string, fileContent: string): string[] {
    const extension = path.extname(filePath).toLowerCase();
    const language = extensionToLanguageMap[extension];

    if (!language) {
      return [];
    }

    const patterns = dependencyRegex[language];
    const dependencies = new Set<string>();

    // Remove comments to avoid matching dependencies in commented-out code.
    // This is a simplified comment removal and might not cover all edge cases.
    const contentWithoutComments = this.removeComments(fileContent, language);

    for (const pattern of patterns) {
      const matches = contentWithoutComments.matchAll(pattern);
      for (const match of matches) {
        // The first capture group usually holds the dependency path.
        if (match[1]) {
          dependencies.add(match[1].trim());
        }
      }
    }

    return Array.from(dependencies);
  }

  /**
   * A helper function to remove comments from code to prevent false positives.
   * Note: This is a simplified implementation and may not handle all edge cases
   * perfectly (e.g., comments within strings).
   * @param content The source code content.
   * @param language The language identifier.
   * @returns The content with comments removed.
   */
  private static removeComments(content: string, language: keyof typeof dependencyRegex): string {
    switch (language) {
      case 'javascript':
        // Removes single-line and multi-line comments
        return content.replace(/\/\*[\s\S]*?\*\/|(?<=[^:])\/\/.*$/gm, '');
      case 'python':
        // Removes single-line comments
        return content.replace(/#.*$/gm, '');
      case 'css':
        // Removes multi-line comments
        return content.replace(/\/\*[\s\S]*?\*\//g, '');
      default:
        return content;
    }
  }
}
