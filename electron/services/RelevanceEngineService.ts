// AI Summary: Orchestrates context analysis by identifying direct dependencies and keyword matches.
// Uses DependencyScanner for fast, regex-based analysis and FileService to resolve module paths and find keyword-relevant files,
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
   * Extracts keywords from a text string for context analysis.
   * @param text The text to process.
   * @returns An array of unique, lowercase keywords.
   */
  private _extractKeywords(text: string): string[] {
    if (!text) return [];

    const stopWords = new Set([
      'a', 'an', 'the', 'is', 'in', 'it', 'of', 'for', 'on', 'with', 'to', 'and', 'or',
      'fix', 'update', 'change', 'add', 'remove', 'implement', 'refactor', 'style'
    ]);

    const keywords = text
      .toLowerCase()
      .match(/\b[a-zA-Z_][a-zA-Z0-9_-]*\b/g) // Split into words, allow snake/kebab case
      ?.filter(word => word.length >= 3 && !stopWords.has(word)) || [];

    return [...new Set(keywords)]; // Return unique keywords
  }

  /**
   * Calculates the context for a given set of selected files and a task description.
   * @param selectedFilePaths An array of project-relative paths for the selected files.
   * @param taskDescription The user-provided description of the task.
   * @returns An object containing the selected files and their neighboring (dependency and keyword-matched) files.
   */
  public async calculateContext(
    selectedFilePaths: string[],
    taskDescription?: string
  ): Promise<ContextResult> {
    const dependencyNeighbors = new Set<string>();
    const keywordMatches = new Set<string>();

    // 1. Dependency Analysis
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
            dependencyNeighbors.add(resolvedPath);
          }
        }
      } catch (error) {
        console.error(`[RelevanceEngine] Error processing file ${filePath} for dependencies:`, error);
      }
    }

    // 2. Task Keyword Analysis
    if (taskDescription) {
      const keywords = this._extractKeywords(taskDescription);
      if (keywords.length > 0) {
        try {
          const allProjectFiles = await this.fileService.getAllFilePaths();
          for (const projectFile of allProjectFiles) {
            const lowerCasePath = projectFile.toLowerCase();
            if (keywords.some(keyword => lowerCasePath.includes(keyword))) {
              keywordMatches.add(projectFile);
            }
          }
        } catch (error) {
          console.error(`[RelevanceEngine] Error during keyword analysis:`, error);
        }
      }
    }

    // 3. Combine results
    const combinedNeighbors = new Set([...dependencyNeighbors, ...keywordMatches]);

    // Ensure neighboring files don't include any of the primary selected files
    selectedFilePaths.forEach(path => combinedNeighbors.delete(path));

    return {
      selected: selectedFilePaths,
      neighboring: Array.from(combinedNeighbors),
    };
  }
}
