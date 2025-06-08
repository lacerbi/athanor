// AI Summary: Orchestrates context analysis by identifying direct dependencies for a given set of files.
// Uses DependencyScanner for fast, regex-based analysis and FileService to resolve module paths,
// forming the "neighboring" context for AI prompts.

import { FileService } from './FileService';
import { DependencyScanner } from './DependencyScanner';
import { PathUtils } from './PathUtils';

interface ContextResult {
  selected: string[];
  neighboring: string[];
}

export class RelevanceEngineService {
  private fileService: FileService;
  private readonly resolvableExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];

  constructor(fileService: FileService) {
    this.fileService = fileService;
  }

  /**
   * Resolves a dependency specifier to a project-relative file path.
   * @param sourceFilePath The project-relative path of the file containing the import.
   * @param specifier The module specifier from the import/require statement.
   * @returns A project-relative path to the dependency file, or null if not found.
   */
  private async resolveDependency(sourceFilePath: string, specifier: string): Promise<string | null> {
    // Ignore node_modules and other non-relative paths for now
    if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
      return null;
    }

    const sourceDir = PathUtils.dirname(sourceFilePath);
    const potentialPath = PathUtils.normalizeToUnix(PathUtils.joinUnix(sourceDir, specifier));

    // Check for exact match if it's not a directory
    if (await this.fileService.exists(potentialPath)) {
        if (!(await this.fileService.isDirectory(potentialPath))) {
            return potentialPath;
        }
    }

    // Try with extensions
    for (const ext of this.resolvableExtensions) {
      const pathWithExt = `${potentialPath}${ext}`;
      if (await this.fileService.exists(pathWithExt)) {
        return pathWithExt;
      }
    }
    
    // Try as a directory with an index file
    for (const ext of this.resolvableExtensions) {
        const indexPath = PathUtils.joinUnix(potentialPath, `index${ext}`);
        if (await this.fileService.exists(indexPath)) {
            return indexPath;
        }
    }

    return null;
  }

  /**
   * Calculates the context for a given set of selected files.
   * @param selectedFilePaths An array of project-relative paths for the selected files.
   * @returns An object containing the selected files and their neighboring (dependency) files.
   */
  public async calculateContext(selectedFilePaths: string[]): Promise<ContextResult> {
    const neighboringFiles = new Set<string>();

    for (const filePath of selectedFilePaths) {
      try {
        if (!(await this.fileService.exists(filePath))) {
          console.warn(`[RelevanceEngine] Selected file does not exist, skipping: ${filePath}`);
          continue;
        }

        const content = await this.fileService.read(filePath, { encoding: 'utf-8' }) as string;
        const dependencies = DependencyScanner.scan(filePath, content);

        for (const specifier of dependencies) {
          const resolvedPath = await this.resolveDependency(filePath, specifier);
          if (resolvedPath) {
            neighboringFiles.add(resolvedPath);
          }
        }
      } catch (error) {
        console.error(`[RelevanceEngine] Error processing file ${filePath}:`, error);
      }
    }

    // Ensure neighboring files don't include any of the primary selected files
    selectedFilePaths.forEach(path => neighboringFiles.delete(path));

    return {
      selected: selectedFilePaths,
      neighboring: Array.from(neighboringFiles),
    };
  }
}
