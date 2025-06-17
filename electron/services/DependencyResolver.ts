// AI Summary: Centralized dependency resolution service for resolving import specifiers to file paths.
// Handles JavaScript/TypeScript module resolution with support for relative paths and common extensions.
// Designed to be extended with language-specific resolution logic.

import { FileService } from './FileService';
import { PathUtils } from './PathUtils';

export class DependencyResolver {
  private static readonly resolvableExtensions = [
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
    for (const ext of this.resolvableExtensions) {
      const pathWithExt = `${potentialPath}${ext}`;
      if (await fileService.exists(pathWithExt)) {
        return pathWithExt;
      }
    }

    // Try as a directory with an index file
    for (const ext of this.resolvableExtensions) {
      const indexPath = PathUtils.joinUnix(potentialPath, `index${ext}`);
      if (await fileService.exists(indexPath)) {
        return indexPath;
      }
    }

    return null;
  }
}
