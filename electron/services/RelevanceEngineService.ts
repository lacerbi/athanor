// AI Summary: Orchestrates a two-phase context analysis using a scoring engine to identify relevant 'neighboring' files.
// It uses heuristics like shared Git commits, direct dependencies, and keyword/path analysis to build a rich, token-budgeted context for AI prompts.

import { FileService } from './FileService';
import type { IGitService } from '../../common/types/git-service';
import { DependencyScanner } from './DependencyScanner';
import { PathUtils } from './PathUtils';
import { CONTEXT_BUILDER, SETTINGS } from '../../src/utils/constants';
import * as PromptUtils from './PromptUtils';
import { ProjectGraphService } from './ProjectGraphService';
import { extractKeywords } from './TaskAnalysisUtils';

interface ContextResult {
  userSelected: string[];
  heuristicSeedFiles: string[];
  allNeighbors: Array<{ path: string; score: number }>;
  promptNeighbors: string[];
}

export class RelevanceEngineService {
  private readonly fileService: FileService;
  private readonly gitService: IGitService;
  private readonly projectGraphService: ProjectGraphService;
  private readonly resolvableExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];

  constructor(
    fileService: FileService,
    gitService: IGitService,
    projectGraphService: ProjectGraphService
  ) {
    this.fileService = fileService;
    this.gitService = gitService;
    this.projectGraphService = projectGraphService;
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
   * Calculates the context for a given set of selected files and a task description.
   * @param originallySelectedFiles An array of project-relative paths for the selected files.
   * @param taskDescription The user-provided description of the task.
   * @returns An object containing the selected files and their neighboring (dependency and keyword-matched) files.
   */
  public async calculateContext(
    originallySelectedFiles: string[],
    taskDescription?: string
  ): Promise<ContextResult> {
    this.gitService.setBaseDir(this.fileService.getBaseDir());
    const allProjectFiles = await this.fileService.getAllFilePaths();
    const isGitRepo = await this.gitService.isGitRepository();
    const originalSelectionSet = new Set(originallySelectedFiles);

    // This is the core scoring logic that will be used for both preliminary and final rounds.
    const runScoringRound = async (
      seedBasket: { path: string, isOriginallySelected: boolean }[],
      candidateFiles: string[]
    ): Promise<Map<string, number>> => {
      const scores = new Map<string, number>();
      const candidateSet = new Set(candidateFiles);
      const addScore = (filePath: string, score: number, modifier: number = 1) => {
        scores.set(filePath, (scores.get(filePath) || 0) + score * modifier);
      };

      // Task Keyword Analysis
      if (taskDescription) {
        const keywords = extractKeywords(taskDescription);
        if (keywords.length > 0) {
          for (const file of candidateFiles) {
            const lowerCasePath = file.toLowerCase();
            const matches = keywords.filter(k => lowerCasePath.includes(k));
            if (matches.length > 0) {
              const score = matches.length > 1 ? CONTEXT_BUILDER.SCORE_TASK_KEYWORD_MULTI : CONTEXT_BUILDER.SCORE_TASK_KEYWORD_SINGLE;
              addScore(file, score);
            }
          }
        }
      }

      // Project Hub Analysis
      const hubFiles = new Set(this.projectGraphService.getHubFiles());
      for (const file of candidateFiles) {
        if (hubFiles.has(file)) {
          addScore(file, CONTEXT_BUILDER.SCORE_PROJECT_HUB);
        }
      }

      const sharedCommitCounts = new Map<string, number>();
      if (isGitRepo) {
        const commitFilesCache = new Map<string, string[]>();
        for (const seed of seedBasket) {
          const commits = await this.gitService.getCommitsForFile(seed.path, { maxCount: CONTEXT_BUILDER.MAX_COMMITS_TO_CHECK });
          for (const commit of commits) {
            let filesInCommit = commitFilesCache.get(commit.hash);
            if (!filesInCommit) {
              filesInCommit = await this.gitService.getFilesForCommit(commit.hash);
              commitFilesCache.set(commit.hash, filesInCommit);
            }
            for (const file of filesInCommit) {
              if (candidateSet.has(file)) {
                const modifier = seed.isOriginallySelected ? 1.0 : 0.5;
                sharedCommitCounts.set(file, (sharedCommitCounts.get(file) || 0) + modifier);
              }
            }
          }
        }
        for (const [file, count] of sharedCommitCounts.entries()) {
          const score = count >= 3 ? CONTEXT_BUILDER.SCORE_SHARED_COMMIT_MULTI : CONTEXT_BUILDER.SCORE_SHARED_COMMIT_SINGLE;
          addScore(file, score);
        }
      }

      for (const seed of seedBasket) {
        const modifier = seed.isOriginallySelected ? 1.0 : 0.5;
        // Direct Dependencies
        if (await this.fileService.exists(seed.path)) {
          const content = await this.fileService.read(seed.path, { encoding: 'utf-8' }) as string;
          const dependencies = DependencyScanner.scan(seed.path, content);
          for (const specifier of dependencies) {
            const resolvedPath = await this.resolveDependency(seed.path, specifier);
            if (resolvedPath && candidateSet.has(resolvedPath)) {
              addScore(resolvedPath, CONTEXT_BUILDER.SCORE_DIRECT_DEPENDENCY, modifier);
            }
          }
        }

        // File Mentions
        const mentionedFiles = this.projectGraphService.getMentionsForFile(seed.path);
        for (const mentionedFile of mentionedFiles) {
          if (candidateSet.has(mentionedFile)) {
            addScore(mentionedFile, CONTEXT_BUILDER.SCORE_FILE_MENTION, modifier);
          }
        }

        // Path-based heuristics
        const seedDir = PathUtils.dirname(seed.path);
        const seedExt = PathUtils.extname(seed.path);
        const seedBase = PathUtils.basename(seed.path, seedExt);
        for (const candidateFile of candidateFiles) {
          if (PathUtils.dirname(candidateFile) === seedDir) {
            addScore(candidateFile, CONTEXT_BUILDER.SCORE_SAME_FOLDER, modifier);
            const candidateExt = PathUtils.extname(candidateFile);
            const candidateBase = PathUtils.basename(candidateFile, candidateExt);
            if (seedBase === candidateBase) {
              addScore(candidateFile, CONTEXT_BUILDER.SCORE_SIBLING_FILE, modifier);
            }
          }
        }
      }

      return scores;
    };

    // --- PHASE 1: SEED BASKET CREATION ---
    let seedBasket: { path: string, isOriginallySelected: boolean }[] = originallySelectedFiles.map(p => ({ path: p, isOriginallySelected: true }));

    if (seedBasket.length <= CONTEXT_BUILDER.SEED_TRIGGER_THRESHOLD) {
      const preliminaryCandidates = allProjectFiles.filter(p => !originalSelectionSet.has(p));
      const preliminaryScores = await runScoringRound(seedBasket, preliminaryCandidates);
      const topHeuristicFiles = Array.from(preliminaryScores.entries())
        .sort(([, a], [, b]) => b - a)
        .map(([path]) => path);

      const filesToAdd = CONTEXT_BUILDER.SEED_BASKET_SIZE - seedBasket.length;
      for (let i = 0; i < Math.min(topHeuristicFiles.length, filesToAdd); i++) {
        if (!originalSelectionSet.has(topHeuristicFiles[i])) {
          seedBasket.push({ path: topHeuristicFiles[i], isOriginallySelected: false });
        }
      }
    }
    
    // --- PHASE 2: NEIGHBORHOOD SCORING & SELECTION ---
    const finalSeedSet = new Set(seedBasket.map(s => s.path));
    const finalCandidates = allProjectFiles.filter(p => !finalSeedSet.has(p));
    const finalScores = await runScoringRound(seedBasket, finalCandidates);

    // Greedy Token-Based Selection
    const sortedNeighbors = Array.from(finalScores.entries())
      .filter(([, score]) => score >= CONTEXT_BUILDER.SCORE_THRESHOLD)
      .sort(([, a], [, b]) => b - a);

    const promptNeighbors: string[] = [];
    let currentTokens = 0;
    const smartPreviewConfig = {
      minLines: SETTINGS.defaults.application.minSmartPreviewLines,
      maxLines: SETTINGS.defaults.application.maxSmartPreviewLines,
    };

    for (const [filePath] of sortedNeighbors) {
      try {
        const content = await this.fileService.read(filePath, { encoding: 'utf-8' }) as string;
        const preview = PromptUtils.getSmartPreview(content, smartPreviewConfig);
        const tokenCount = PromptUtils.countTokens(preview);

        if (currentTokens + tokenCount <= CONTEXT_BUILDER.MAX_NEIGHBOR_TOKENS) {
          promptNeighbors.push(filePath);
          currentTokens += tokenCount;
        } else {
          break;
        }
      } catch (error) {
        console.error(`[RelevanceEngine] Error processing file for token counting: ${filePath}`, error);
      }
    }
    
    // Separate heuristically added files from user selections
    const heuristicSeedFiles = seedBasket
      .filter(seed => !seed.isOriginallySelected)
      .map(seed => seed.path);
    
    return {
      userSelected: originallySelectedFiles,
      heuristicSeedFiles: heuristicSeedFiles,
      allNeighbors: sortedNeighbors.map(([path, score]) => ({ path, score })),
      promptNeighbors: promptNeighbors,
    };
  }
}
