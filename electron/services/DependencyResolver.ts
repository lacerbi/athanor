// AI Summary: Centralized dependency resolution service for resolving import specifiers to file paths.
// Supports both JavaScript/TypeScript and Python module resolution with language-specific logic.
// Handles Python relative imports (., ..) and absolute imports (my_app.utils).

import { FileService } from './FileService';
import { PathUtils } from './PathUtils';

export class DependencyResolver {
  private static readonly jsResolvableExtensions = [
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.json',
  ];

  /**
   * Resolves a dependency specifier to a project-relative file path.
   * @param sourceFilePath The project-relative path of the file containing the import.
   * @param specifier The module specifier from the import/require statement.
   * @param fileService The FileService instance for file system operations.
   * @returns A project-relative path to the dependency file, or null if not found.
   */
  public static async resolve(
    sourceFilePath: string,
    specifier: string,
    fileService: FileService
  ): Promise<string | null> {
    const sourceExt = PathUtils.extname(sourceFilePath);
    
    if (sourceExt === '.py') {
      return this.resolvePython(sourceFilePath, specifier, fileService);
    }
    
    // Handle JavaScript/TypeScript and other languages
    return this.resolveJS(sourceFilePath, specifier, fileService);
  }

  /**
   * Resolves JavaScript/TypeScript dependencies using Node.js-style resolution.
   * @param sourceFilePath The project-relative path of the file containing the import.
   * @param specifier The module specifier from the import/require statement.
   * @param fileService The FileService instance for file system operations.
   * @returns A project-relative path to the dependency file, or null if not found.
   */
  private static async resolveJS(
    sourceFilePath: string,
    specifier: string,
    fileService: FileService
  ): Promise<string | null> {
    try {
      // Ignore node_modules and other non-relative paths for now
      if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
        return null;
      }

      const sourceDir = PathUtils.dirname(sourceFilePath);
      const potentialPath = PathUtils.normalizeToUnix(
        PathUtils.joinUnix(sourceDir, specifier)
      );

      // Check for exact match if it's not a directory
      if (await fileService.exists(potentialPath)) {
        if (!(await fileService.isDirectory(potentialPath))) {
          return potentialPath;
        }
      }

      // Try with extensions
      for (const ext of this.jsResolvableExtensions) {
        const pathWithExt = `${potentialPath}${ext}`;
        if (await fileService.exists(pathWithExt)) {
          return pathWithExt;
        }
      }

      // Try as a directory with an index file
      for (const ext of this.jsResolvableExtensions) {
        const indexPath = PathUtils.joinUnix(potentialPath, `index${ext}`);
        if (await fileService.exists(indexPath)) {
          return indexPath;
        }
      }

      return null;
    } catch (error) {
      // Handle file system errors gracefully
      return null;
    }
  }

  /**
   * Resolves Python dependencies using Python's import resolution rules.
   * @param sourceFilePath The project-relative path of the file containing the import.
   * @param specifier The module specifier from the import/require statement.
   * @param fileService The FileService instance for file system operations.
   * @returns A project-relative path to the dependency file, or null if not found.
   */
  private static async resolvePython(
    sourceFilePath: string,
    specifier: string,
    fileService: FileService
  ): Promise<string | null> {
    if (specifier.startsWith('.')) {
      // Handle relative imports
      return this.resolvePythonRelative(sourceFilePath, specifier, fileService);
    } else {
      // Handle absolute imports
      return this.resolvePythonAbsolute(specifier, fileService);
    }
  }

  /**
   * Resolves Python relative imports (starting with . or ..).
   * @param sourceFilePath The project-relative path of the file containing the import.
   * @param specifier The relative import specifier (e.g., '.', '.utils', '..config').
   * @param fileService The FileService instance for file system operations.
   * @returns A project-relative path to the dependency file, or null if not found.
   */
  private static async resolvePythonRelative(
    sourceFilePath: string,
    specifier: string,
    fileService: FileService
  ): Promise<string | null> {
    try {
      // Count leading dots to determine how many levels to go up
      let dotCount = 0;
      for (const char of specifier) {
        if (char === '.') {
          dotCount++;
        } else {
          break;
        }
      }

      // Get the base path by going up the appropriate number of levels
      let basePath = PathUtils.dirname(sourceFilePath);
      for (let i = 1; i < dotCount; i++) {
        basePath = PathUtils.dirname(basePath);
      }

      // Extract the module part after the dots
      const modulePart = specifier.substring(dotCount);
      
      if (!modulePart) {
        // Import like "from ." - refers to the current package's __init__.py
        const initPath = PathUtils.joinUnix(basePath, '__init__.py');
        if (await fileService.exists(initPath)) {
          return initPath;
        }
        return null;
      }

      // Convert dots in module part to path separators
      const relativePath = modulePart.replace(/\./g, '/');
      const potentialPath = PathUtils.joinUnix(basePath, relativePath);

      // Check for module.py
      const modulePath = `${potentialPath}.py`;
      if (await fileService.exists(modulePath)) {
        return modulePath;
      }

      // Check for package/__init__.py
      const packageInitPath = PathUtils.joinUnix(potentialPath, '__init__.py');
      if (await fileService.exists(packageInitPath)) {
        return packageInitPath;
      }

      return null;
    } catch (error) {
      // Handle file system errors gracefully
      return null;
    }
  }

  /**
   * Resolves Python absolute imports (e.g., 'my_app.utils').
   * @param specifier The absolute import specifier.
   * @param fileService The FileService instance for file system operations.
   * @returns A project-relative path to the dependency file, or null if not found.
   */
  private static async resolvePythonAbsolute(
    specifier: string,
    fileService: FileService
  ): Promise<string | null> {
    try {
      // Convert dots to path separators
      const modulePath = specifier.replace(/\./g, '/');

      // Check for module.py
      const filePath = `${modulePath}.py`;
      if (await fileService.exists(filePath)) {
        return filePath;
      }

      // Check for package/__init__.py
      const packageInitPath = PathUtils.joinUnix(modulePath, '__init__.py');
      if (await fileService.exists(packageInitPath)) {
        return packageInitPath;
      }

      return null;
    } catch (error) {
      // Handle file system errors gracefully
      return null;
    }
  }
}
