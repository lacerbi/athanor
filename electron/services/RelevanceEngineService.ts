// AI Summary: Orchestrates a two-phase context analysis using a scoring engine to identify relevant 'neighboring' files.
// It uses heuristics like shared Git commits, direct dependencies, and keyword/path analysis to build a rich, token-budgeted context for AI prompts.

import { FileService } from './FileService';
import type { IGitService } from '../../common/types/git-service';
import { DependencyScanner } from './DependencyScanner';
import { PathUtils } from './PathUtils';
import { CONTEXT_BUILDER, SETTINGS } from '../../src/utils/constants';
import * as PromptUtils from './PromptUtils';
import { ProjectGraphService } from './ProjectGraphService';
import { analyzeTaskDescription } from './TaskAnalysisUtils';
import { UserActivityService } from './UserActivityService';
import { DependencyResolver } from './DependencyResolver';

interface ContextResult {
  userSelected: string[];
  heuristicSeedFiles: Array<{ path: string; score: number }>;
  allNeighbors: Array<{ path: string; score: number }>;
  promptNeighbors: string[];
}

export class RelevanceEngineService {
  private readonly fileService: FileService;
  private readonly gitService: IGitService;
  private readonly projectGraphService: ProjectGraphService;
  private readonly userActivityService: UserActivityService;

  constructor(
    fileService: FileService,
    gitService: IGitService,
    projectGraphService: ProjectGraphService,
    userActivityService: UserActivityService
  ) {
    this.fileService = fileService;
    this.gitService = gitService;
    this.projectGraphService = projectGraphService;
    this.userActivityService = userActivityService;
  }


  /**
   * Calculates the context for a given set of selected files and a task description.
   * @param originallySelectedFiles An array of project-relative paths for the selected files.
   * @param taskDescription The user-provided description of the task.
   * @param options Configuration options including maxNeighborTokens.
   * @returns An object containing the selected files and their neighboring (dependency and keyword-matched) files.
   */
  public async calculateContext(
    originallySelectedFiles: string[],
    taskDescription: string | undefined,
    options: { maxNeighborTokens: number }
  ): Promise<ContextResult> {
    this.gitService.setBaseDir(this.fileService.getBaseDir());
    const allProjectFiles = await this.fileService.getAllFilePaths();
    const isGitRepo = await this.gitService.isGitRepository();
    const originalSelectionSet = new Set(originallySelectedFiles);

    // This is the core scoring logic that will be used for both preliminary and final rounds.
    const runScoringRound = async (
      seedBasket: { path: string; isOriginallySelected: boolean }[],
      candidateFiles: string[]
    ): Promise<Map<string, number>> => {
      const scores = new Map<string, number>();
      const candidateSet = new Set(candidateFiles);
      const addScore = (
        filePath: string,
        score: number,
        modifier: number = 1
      ) => {
        scores.set(filePath, (scores.get(filePath) || 0) + score * modifier);
      };

      // Task Analysis with Hierarchical Scoring
      if (taskDescription) {
        const { pathMentions, keywords } =
          analyzeTaskDescription(taskDescription);
        const pathScores = new Map<string, number>();

        // High-Priority: Path-based scoring.
        // Iterate through each candidate file and find its best score across all path mentions.
        // This ensures the highest-value match (e.g., exact match) always wins.
        for (const candidateFile of candidateFiles) {
          let maxScoreForFile = 0;
          const normalizedCandidate = candidateFile.toLowerCase();
          const candidateBasename = PathUtils.basename(normalizedCandidate);

          for (const mentionedPath of pathMentions) {
            // Normalize the mentioned path: lowercase, Unix separators, remove leading ./ and trailing /
            let normalizedMention = PathUtils.normalizeToUnix(
              mentionedPath.toLowerCase()
            );
            if (normalizedMention.startsWith('./')) {
              normalizedMention = normalizedMention.slice(2);
            }
            normalizedMention =
              PathUtils.removeTrailingSlash(normalizedMention);

            // Exact Match - highest priority
            if (normalizedCandidate === normalizedMention) {
              maxScoreForFile = Math.max(
                maxScoreForFile,
                CONTEXT_BUILDER.SCORE_TASK_PATH_EXACT_MATCH
              );
              // Optimization: We've found the best possible score for this file,
              // so we can stop checking other mentions for it.
              break;
            }

            // Folder Match
            if (normalizedCandidate.startsWith(normalizedMention + '/')) {
              maxScoreForFile = Math.max(
                maxScoreForFile,
                CONTEXT_BUILDER.SCORE_TASK_PATH_FOLDER_MATCH
              );
            }

            // Basename or Partial Match
            if (
              normalizedMention &&
              (candidateBasename === normalizedMention ||
                normalizedCandidate.endsWith(normalizedMention))
            ) {
              maxScoreForFile = Math.max(
                maxScoreForFile,
                CONTEXT_BUILDER.SCORE_TASK_PATH_BASENAME_OR_PARTIAL_MATCH
              );
            }
          }

          if (maxScoreForFile > 0) {
            pathScores.set(candidateFile, maxScoreForFile);
          }
        }

        // Apply the calculated best scores
        for (const [file, score] of pathScores.entries()) {
          addScore(file, score);
        }

        // Lower-Priority: General keyword scoring (excluding already scored files)
        if (keywords.length > 0) {
          for (const candidateFile of candidateFiles) {
            // This check ensures we don't add keyword scores to files that already got a path score
            if (pathScores.has(candidateFile)) continue;

            const lowerCasePath = candidateFile.toLowerCase();
            const matches = keywords.filter((k) => lowerCasePath.includes(k));
            if (matches.length > 0) {
              const score =
                matches.length > 1
                  ? CONTEXT_BUILDER.SCORE_TASK_KEYWORD_MULTI
                  : CONTEXT_BUILDER.SCORE_TASK_KEYWORD_SINGLE;
              addScore(candidateFile, score);
            }
          }
        }
      }

      // Actively Editing Analysis
      const activeFiles = this.userActivityService.getActiveFiles();
      if (activeFiles.length > 0) {
        const activeFilesSet = new Set(activeFiles);
        for (const candidateFile of candidateFiles) {
          if (activeFilesSet.has(candidateFile)) {
            addScore(
              candidateFile,
              CONTEXT_BUILDER.SCORE_ACTIVELY_EDITING
            );
          }
        }
      }

      // Project Hub Analysis
      const hubFiles = this.projectGraphService.getHubFiles();
      if (hubFiles.length > 0) {
        hubFiles.forEach((hubFile, rank) => {
          if (candidateSet.has(hubFile)) {
            const score = Math.max(
              CONTEXT_BUILDER.SCORE_PROJECT_HUB_MAX - rank,
              CONTEXT_BUILDER.SCORE_PROJECT_HUB_MIN
            );
            addScore(hubFile, score);
          }
        });
      }

      // Recent Commit Activity Analysis
      const recentFiles = this.projectGraphService.getRecentlyCommittedFiles();
      if (recentFiles.length > 0) {
        const recentFilesSet = new Set(recentFiles);
        for (const candidateFile of candidateFiles) {
          if (recentFilesSet.has(candidateFile)) {
            addScore(
              candidateFile,
              CONTEXT_BUILDER.SCORE_RECENT_COMMIT_ACTIVITY
            );
          }
        }
      }

      const sharedCommitCounts = new Map<string, number>();
      if (isGitRepo) {
        for (const seed of seedBasket) {
          const peers = this.projectGraphService.getSharedCommitPeers(seed.path);
          const modifier = seed.isOriginallySelected ? 1.0 : 0.5;
          for (const peer of peers) {
            if (candidateSet.has(peer.file)) {
              sharedCommitCounts.set(
                peer.file,
                (sharedCommitCounts.get(peer.file) || 0) +
                  peer.count * modifier
              );
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

      for (const seed of seedBasket) {
        const modifier = seed.isOriginallySelected ? 1.0 : 0.5;
        // Direct Dependencies
        if (await this.fileService.exists(seed.path)) {
          const content = (await this.fileService.read(seed.path, {
            encoding: 'utf-8',
          })) as string;
          const dependencies = DependencyScanner.scan(seed.path, content);
          for (const specifier of dependencies) {
            const resolvedPath = await DependencyResolver.resolve(
              seed.path,
              specifier,
              this.fileService
            );
            if (resolvedPath && candidateSet.has(resolvedPath)) {
              addScore(
                resolvedPath,
                CONTEXT_BUILDER.SCORE_DIRECT_DEPENDENCY,
                modifier
              );
            }
          }
        }

        // File Mentions
        const mentionedFiles = this.projectGraphService.getMentionsForFile(
          seed.path
        );
        for (const mentionedFile of mentionedFiles) {
          if (candidateSet.has(mentionedFile)) {
            addScore(
              mentionedFile,
              CONTEXT_BUILDER.SCORE_FILE_MENTION,
              modifier
            );
          }
        }

        // Path-based heuristics
        const seedDir = PathUtils.dirname(seed.path);
        const seedExt = PathUtils.extname(seed.path);
        const seedBase = PathUtils.basename(seed.path, seedExt);
        for (const candidateFile of candidateFiles) {
          if (PathUtils.dirname(candidateFile) === seedDir) {
            addScore(
              candidateFile,
              CONTEXT_BUILDER.SCORE_SAME_FOLDER,
              modifier
            );
            const candidateExt = PathUtils.extname(candidateFile);
            const candidateBase = PathUtils.basename(
              candidateFile,
              candidateExt
            );
            if (seedBase === candidateBase) {
              addScore(
                candidateFile,
                CONTEXT_BUILDER.SCORE_SIBLING_FILE,
                modifier
              );
            }
          }
        }
      }

      return scores;
    };

    // --- PHASE 1: SEED BASKET CREATION ---
    let seedBasket: {
      path: string;
      isOriginallySelected: boolean;
      score: number;
    }[] = originallySelectedFiles.map((p) => ({
      path: p,
      isOriginallySelected: true,
      score: Infinity,
    }));

    if (seedBasket.length <= CONTEXT_BUILDER.SEED_TRIGGER_THRESHOLD) {
      const preliminaryCandidates = allProjectFiles.filter(
        (p) => !originalSelectionSet.has(p)
      );
      const preliminaryScores = await runScoringRound(
        seedBasket,
        preliminaryCandidates
      );
      const topHeuristicFiles = Array.from(preliminaryScores.entries()).sort(
        ([, a], [, b]) => b - a
      );

      const filesToAdd = CONTEXT_BUILDER.SEED_BASKET_SIZE - seedBasket.length;
      for (let i = 0; i < Math.min(topHeuristicFiles.length, filesToAdd); i++) {
        const [path, score] = topHeuristicFiles[i];
        if (!originalSelectionSet.has(path)) {
          seedBasket.push({
            path: path,
            isOriginallySelected: false,
            score: score,
          });
        }
      }
    }

    // --- PHASE 2: NEIGHBORHOOD SCORING & SELECTION ---
    const finalSeedSet = new Set(seedBasket.map((s) => s.path));
    const finalCandidates = allProjectFiles.filter((p) => !finalSeedSet.has(p));
    const finalScores = await runScoringRound(seedBasket, finalCandidates);

    // Calculate dynamic threshold based on maximum neighbor score
    const maxScore = Math.max(0, ...finalScores.values());
    const dynamicCutoff = maxScore * CONTEXT_BUILDER.NEIGHBOR_SCORE_CUTOFF_RATIO;

    // Greedy Token-Based Selection
    const sortedNeighbors = Array.from(finalScores.entries())
      .filter(([, score]) => 
        score >= dynamicCutoff && score >= CONTEXT_BUILDER.SCORE_THRESHOLD
      )
      .sort(([, a], [, b]) => b - a);

    const promptNeighbors: string[] = [];
    let currentTokens = 0;
    const smartPreviewConfig = {
      minLines: SETTINGS.defaults.application.minSmartPreviewLines,
      maxLines: SETTINGS.defaults.application.maxSmartPreviewLines,
    };

    for (const [filePath] of sortedNeighbors) {
      try {
        const content = (await this.fileService.read(filePath, {
          encoding: 'utf-8',
        })) as string;
        const preview = PromptUtils.getSmartPreview(
          content,
          smartPreviewConfig
        );
        const tokenCount = PromptUtils.countTokens(preview);

        if (currentTokens + tokenCount <= options.maxNeighborTokens) {
          promptNeighbors.push(filePath);
          currentTokens += tokenCount;
        } else {
          break;
        }
      } catch (error) {
        console.error(
          `[RelevanceEngine] Error processing file for token counting: ${filePath}`,
          error
        );
      }
    }

    // Separate heuristically added files from user selections
    const heuristicSeedFiles = seedBasket
      .filter((seed) => !seed.isOriginallySelected)
      .map((seed) => ({ path: seed.path, score: seed.score }));

    return {
      userSelected: originallySelectedFiles,
      heuristicSeedFiles: heuristicSeedFiles,
      allNeighbors: sortedNeighbors.map(([path, score]) => ({ path, score })),
      promptNeighbors: promptNeighbors,
    };
  }
}
