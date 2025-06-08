// AI Summary: Orchestrates context analysis using a scoring engine to identify relevant 'neighboring' files.
// It uses heuristics like shared Git commits, direct dependencies, keyword matching, and path analysis (siblings, co-location) to build a rich context for AI prompts.

import { FileService } from './FileService';
import type { IGitService } from '../../common/types/git-service';
import { DependencyScanner } from './DependencyScanner';
import { PathUtils } from './PathUtils';
import { CONTEXT_BUILDER } from '../../src/utils/constants';

interface ContextResult {
  selected: string[];
  neighboring: string[];
}

export class RelevanceEngineService {
  private readonly fileService: FileService;
  private readonly gitService: IGitService;
  private readonly resolvableExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];

  constructor(fileService: FileService, gitService: IGitService) {
    this.fileService = fileService;
    this.gitService = gitService;
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
      ?.filter(word => word.length > 3 && !stopWords.has(word)) || [];

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
    this.gitService.setBaseDir(this.fileService.getBaseDir());

    const scores = new Map<string, number>();
    const allProjectFiles = await this.fileService.getAllFilePaths();
    const seedBasket = selectedFilePaths;
    const seedSet = new Set(seedBasket);

    const candidateFiles = allProjectFiles.filter(p => !seedSet.has(p));
    const candidateSet = new Set(candidateFiles);

    const addScore = (filePath: string, score: number) => {
      scores.set(filePath, (scores.get(filePath) || 0) + score);
    };

    // --- Heuristics ---

    // Git-based heuristics
    if (await this.gitService.isGitRepository()) {
      const sharedCommitCounts = new Map<string, number>();
      const commitFilesCache = new Map<string, string[]>();

      for (const seedFile of seedBasket) {
        // Limit to recent history for performance
        const commits = await this.gitService.getCommitsForFile(seedFile, { maxCount: CONTEXT_BUILDER.MAX_COMMITS_TO_CHECK });
        for (const commit of commits) {
          let filesInCommit = commitFilesCache.get(commit.hash);
          if (!filesInCommit) {
            filesInCommit = await this.gitService.getFilesForCommit(commit.hash);
            commitFilesCache.set(commit.hash, filesInCommit);
          }
          for (const file of filesInCommit) {
            if (candidateSet.has(file)) {
              sharedCommitCounts.set(file, (sharedCommitCounts.get(file) || 0) + 1);
            }
          }
        }
      }

      for (const [file, count] of sharedCommitCounts.entries()) {
        const score =
          count >= 3
            ? CONTEXT_BUILDER.SCORE_SHARED_COMMIT_MULTI
            : CONTEXT_BUILDER.SCORE_SHARED_COMMIT_SINGLE;
        addScore(file, score);
      }
    }

    // 1. Task Keyword Analysis (Independent of seed files)
    if (taskDescription) {
      const keywords = this._extractKeywords(taskDescription);
      if (keywords.length > 0) {
        for (const file of candidateFiles) {
          const lowerCasePath = file.toLowerCase();
          const matches = keywords.filter(keyword =>
            lowerCasePath.includes(keyword)
          );
          if (matches.length > 0) {
            const score =
              matches.length > 1
                ? CONTEXT_BUILDER.SCORE_TASK_KEYWORD_MULTI
                : CONTEXT_BUILDER.SCORE_TASK_KEYWORD_SINGLE;
            addScore(file, score);
          }
        }
      }
    }

    // 2. Seed-based Analysis
    for (const seedFile of seedBasket) {
      // A. Direct Dependencies
      try {
        if (await this.fileService.exists(seedFile)) {
          const content = (await this.fileService.read(seedFile, {
            encoding: 'utf-8',
          })) as string;
          const dependencies = DependencyScanner.scan(seedFile, content);
          for (const specifier of dependencies) {
            const resolvedPath = await this.resolveDependency(
              seedFile,
              specifier
            );
            if (resolvedPath && !seedSet.has(resolvedPath)) {
              addScore(resolvedPath, CONTEXT_BUILDER.SCORE_DIRECT_DEPENDENCY);
            }
          }
        }
      } catch (error) {
        console.error(
          `[RelevanceEngine] Error processing file ${seedFile} for dependencies:`,
          error
        );
      }

      // B. Path-based heuristics
      const seedDir = PathUtils.dirname(seedFile);
      const seedExt = PathUtils.extname(seedFile);
      const seedBase = PathUtils.basename(seedFile, seedExt);

      for (const candidateFile of candidateFiles) {
        if (candidateFile === seedFile) continue;

        const candidateDir = PathUtils.dirname(candidateFile);
        // Folder Co-location
        if (candidateDir === seedDir) {
          addScore(candidateFile, CONTEXT_BUILDER.SCORE_SAME_FOLDER);

          // Sibling File (must be in same folder)
          const candidateExt = PathUtils.extname(candidateFile);
          const candidateBase = PathUtils.basename(candidateFile, candidateExt);
          if (seedBase === candidateBase) {
            addScore(candidateFile, CONTEXT_BUILDER.SCORE_SIBLING_FILE);
          }
        }
      }
    }

    // --- Final Selection ---
    const neighboring = Array.from(scores.entries())
      .filter(([, score]) => score >= CONTEXT_BUILDER.SCORE_THRESHOLD)
      .sort(([, a], [, b]) => b - a)
      .map(([path]) => path);

    return {
      selected: selectedFilePaths,
      neighboring: neighboring,
    };
  }
}
