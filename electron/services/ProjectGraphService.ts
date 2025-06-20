// AI Summary: Analyzes the project structure to build a dependency graph, file mention map, shared commit history, and recent activity log.
// Identifies "hub files" with high in-degrees and provides methods to query relationships,
// supporting the RelevanceEngineService with deeper contextual insights.

import { FileService } from './FileService';
import { DependencyScanner } from './DependencyScanner';
import { PathUtils } from './PathUtils';
import type { IGitService } from '../../common/types/git-service';
import { PROJECT_ANALYSIS } from '../../src/utils/constants';
import { DependencyResolver } from './DependencyResolver';

// Define a type for the cache data structure
export interface ProjectGraphCache {
  dependencyGraph: [string, string[]][];
  dependentsGraph: [string, string[]][];
  fileMentions: [string, string[]][];
  hubFiles: string[];
  sharedCommitGraph: [string, { file: string; count: number }[]][];
  recentlyCommittedFiles: string[];
}

const CACHE_FILENAME = 'project_graph.json';

// Define a threshold for what constitutes a "hub file"
const HUB_FILE_IN_DEGREE_THRESHOLD = 5; // A file is a hub if 5+ other files import it
const MAX_HUB_FILES = 10; // Or if it's in the top 10 most imported files, with at least 2 imports

export class ProjectGraphService {
  private dependencyGraph: Map<string, string[]> = new Map();
  private dependentsGraph: Map<string, string[]> = new Map();
  private fileMentions: Map<string, string[]> = new Map();
  private hubFiles: string[] = [];
  private sharedCommitGraph: Map<string, { file: string; count: number }[]> =
    new Map();
  private recentlyCommittedFiles: string[] = [];

  constructor(
    private readonly fileService: FileService,
    private readonly gitService: IGitService
  ) {}

  /**
   * Returns the current graph state as a serializable object.
   * @returns The project graph cache data.
   */
  public getGraphData(): ProjectGraphCache {
    return {
      dependencyGraph: Array.from(this.dependencyGraph.entries()),
      dependentsGraph: Array.from(this.dependentsGraph.entries()),
      fileMentions: Array.from(this.fileMentions.entries()),
      hubFiles: this.hubFiles,
      sharedCommitGraph: Array.from(this.sharedCommitGraph.entries()),
      recentlyCommittedFiles: this.recentlyCommittedFiles,
    };
  }

  /**
   * Populates the service's internal state from serialized graph data.
   * @param data The project graph cache data.
   */
  public populateGraphFromData(data: ProjectGraphCache): void {
    this.dependencyGraph = new Map(data.dependencyGraph);
    this.dependentsGraph = new Map(data.dependentsGraph);
    this.fileMentions = new Map(data.fileMentions);
    this.hubFiles = data.hubFiles;
    this.sharedCommitGraph = new Map(data.sharedCommitGraph || []);
    this.recentlyCommittedFiles = data.recentlyCommittedFiles || [];
  }

  private getCachePath(): string {
    const materialsDir = this.fileService.getMaterialsDir();
    return this.fileService.join(materialsDir, CACHE_FILENAME);
  }

  async saveGraphToCache(): Promise<void> {
    try {
      const cachePath = this.getCachePath();
      const relativeCachePath = this.fileService.relativize(cachePath);
      const cacheData = this.getGraphData();
      const jsonContent = JSON.stringify(cacheData, null, 2);
      await this.fileService.write(relativeCachePath, jsonContent);
      console.log(
        `[ProjectGraphService] Successfully saved graph to cache at ${cachePath}`
      );
    } catch (error) {
      console.error('[ProjectGraphService] Failed to save graph to cache:', error);
    }
  }

  async loadGraphFromCache(): Promise<boolean> {
    const cachePath = this.getCachePath();
    const relativeCachePath = this.fileService.relativize(cachePath);
    if (!(await this.fileService.exists(relativeCachePath))) {
      return false;
    }

    try {
      const jsonContent = (await this.fileService.read(relativeCachePath, {
        encoding: 'utf-8',
      })) as string;
      const cacheData: ProjectGraphCache = JSON.parse(jsonContent);

      // Validate data before populating
      if (
        !cacheData ||
        !Array.isArray(cacheData.dependencyGraph) ||
        !Array.isArray(cacheData.dependentsGraph) ||
        !Array.isArray(cacheData.fileMentions) ||
        !Array.isArray(cacheData.hubFiles) ||
        !Array.isArray(cacheData.sharedCommitGraph) ||
        !Array.isArray(cacheData.recentlyCommittedFiles)
      ) {
        throw new Error('Invalid cache data format');
      }

      this.populateGraphFromData(cacheData);

      console.log(
        `[ProjectGraphService] Successfully loaded graph from cache at ${cachePath}`
      );
      return true;
    } catch (error) {
      console.error('[ProjectGraphService] Failed to load graph from cache:', error);
      // Clean up potentially corrupt cache file
      await this.fileService
        .remove(relativeCachePath)
        .catch((err) => console.error(`Failed to remove corrupt cache file: ${err}`));
      return false;
    }
  }

  /**
   * Analyzes all files in the project to build dependency and mention graphs.
   * This is a potentially long-running operation.
   */
  public async analyzeProject(): Promise<void> {
    console.log('[ProjectGraphService] Starting project analysis...');

    // Clear previous analysis results
    this.dependencyGraph.clear();
    this.dependentsGraph.clear();
    this.fileMentions.clear();
    this.hubFiles = [];
    this.sharedCommitGraph.clear();
    this.recentlyCommittedFiles = [];

    const allFiles = await this.fileService.getAllFilePaths();
    if (allFiles.length === 0) {
      console.log('[ProjectGraphService] No files to analyze.');
      return;
    }

    const fileBasenames = new Map<string, string>(); // Map basename to full path
    for (const file of allFiles) {
        fileBasenames.set(PathUtils.basename(file), file);
    }
    const basenamesToScan = Array.from(fileBasenames.keys());

    // First pass: scan all files for dependencies and mentions
    for (const filePath of allFiles) {
      try {
        const fileContent = await this.fileService.read(filePath, { encoding: 'utf-8' }) as string;
        
        // 1. Scan for dependencies (using existing stateless scanner)
        // This returns specifiers (e.g., './utils'), not fully resolved paths.
        const dependencies = DependencyScanner.scan(filePath, fileContent);
        this.dependencyGraph.set(filePath, dependencies);

        // 2. Scan for file mentions
        const mentions = new Set<string>();
        for (const basename of basenamesToScan) {
          const mentionedFilePath = fileBasenames.get(basename);
          if (mentionedFilePath === filePath) continue; // Don't count self-mentions

          // To avoid false positives (e.g., 'index' matching everywhere), we look for the basename
          // as a whole word. This is a heuristic and might miss some cases but is a good balance.
          const basenameWithoutExt = PathUtils.basename(basename, PathUtils.extname(basename));
          const mentionRegex = new RegExp(`\\b${this.escapeRegex(basenameWithoutExt)}\\b`, 'g');
          
          if (fileContent.match(mentionRegex)) {
            if (mentionedFilePath) {
                mentions.add(mentionedFilePath);
            }
          }
        }
        if (mentions.size > 0) {
            this.fileMentions.set(filePath, Array.from(mentions));
        }

      } catch (error) {
        // This can happen for binary files or directories, which is expected.
      }
    }

    // Second pass: build dependents graph and identify hub files
    await this.buildDependentsGraphAndIdentifyHubs(allFiles);

    // Third pass: analyze shared commits
    await this.analyzeSharedCommits();

    // Fourth pass: analyze recent commits
    await this.analyzeRecentCommits();

    // Save the results to cache
    await this.saveGraphToCache();

    console.log(
      `[ProjectGraphService] Analysis complete. Found ${this.hubFiles.length} hub files.`
    );
  }

  /**
   * Analyzes the git history to find files that are frequently committed together.
   * This is an expensive operation that should only be run in the background.
   */
  private async analyzeSharedCommits(): Promise<void> {
    if (!(await this.gitService.isGitRepository())) {
      console.log(
        '[ProjectGraphService] Not a Git repository, skipping shared commit analysis.'
      );
      return;
    }

    console.log('[ProjectGraphService] Analyzing shared commits...');
    const MAX_COMMITS_TO_ANALYZE =
      PROJECT_ANALYSIS.MAX_COMMITS_FOR_SHARED_ANALYSIS;
    const recentHashes = await this.gitService.getRecentCommitHashes(
      MAX_COMMITS_TO_ANALYZE
    );

    if (recentHashes.length === 0) {
      console.log('[ProjectGraphService] No recent commits found to analyze.');
      return;
    }

    const filePairCounts = new Map<string, number>();

    for (const hash of recentHashes) {
      // Filter out merge commits which can have a large number of files unrelated to a single change
      const files = await this.gitService.getFilesForCommit(hash);
      // Heuristic: ignore huge commits and commits with only one file
      if (files.length > 1 && files.length < 20) {
        // Sort files to ensure consistent pairing for the key
        files.sort();
        for (let i = 0; i < files.length; i++) {
          for (let j = i + 1; j < files.length; j++) {
            const fileA = files[i];
            const fileB = files[j];
            const key = `${fileA}\t${fileB}`; // Use a separator that is unlikely to be in a file path
            filePairCounts.set(key, (filePairCounts.get(key) || 0) + 1);
          }
        }
      }
    }

    // Transform pair counts into the final graph structure
    for (const [key, count] of filePairCounts.entries()) {
      const [fileA, fileB] = key.split('\t');

      // Add edge from A to B
      const peersA = this.sharedCommitGraph.get(fileA) || [];
      peersA.push({ file: fileB, count });
      this.sharedCommitGraph.set(fileA, peersA);

      // Add edge from B to A
      const peersB = this.sharedCommitGraph.get(fileB) || [];
      peersB.push({ file: fileA, count });
      this.sharedCommitGraph.set(fileB, peersB);
    }
    console.log(
      `[ProjectGraphService] Shared commit analysis complete. Found ${filePairCounts.size} co-committed file pairs.`
    );
  }

  /**
   * Analyzes recent Git commits to find files that have been recently worked on.
   */
  private async analyzeRecentCommits(): Promise<void> {
    if (!(await this.gitService.isGitRepository())) {
      this.recentlyCommittedFiles = [];
      return;
    }
    console.log('[ProjectGraphService] Analyzing recent commit activity...');
    this.recentlyCommittedFiles =
      await this.gitService.getRecentlyCommittedFiles(
        PROJECT_ANALYSIS.DAYS_FOR_RECENT_COMMIT_ACTIVITY
      );
  }

  /**
   * Escapes special characters in a string for use in a RegExp.
   * @param str The string to escape.
   * @returns The escaped string.
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * Builds the reverse dependency graph (dependents) and identifies hub files from the populated dependency graph.
   * @param allFiles All project file paths, used for resolving dependency specifiers.
   */
  private async buildDependentsGraphAndIdentifyHubs(allFiles: string[]): Promise<void> {
    const inDegrees = new Map<string, number>();
    const allFilesSet = new Set(allFiles);

    // Initialize dependents map and in-degrees
    for (const filePath of allFiles) {
        this.dependentsGraph.set(filePath, []);
        inDegrees.set(filePath, 0);
    }

    // Populate dependents and calculate in-degrees by resolving specifiers
    for (const [importerPath, specifiers] of this.dependencyGraph.entries()) {
      for (const specifier of specifiers) {
          const resolvedPath = await DependencyResolver.resolve(importerPath, specifier, this.fileService);
          if (resolvedPath) {
            // Add to dependents graph
            const dependents = this.dependentsGraph.get(resolvedPath) || [];
            if (!dependents.includes(importerPath)) {
                dependents.push(importerPath);
                this.dependentsGraph.set(resolvedPath, dependents);
            }
            // Increment in-degree
            inDegrees.set(resolvedPath, (inDegrees.get(resolvedPath) || 0) + 1);
          }
      }
    }

    // Identify hub files based on in-degree
    const sortedByInDegree = [...inDegrees.entries()].sort((a, b) => b[1] - a[1]);
    
    const hubFiles: string[] = [];
    const addedHubs = new Set<string>();

    // Add files that meet the absolute threshold
    sortedByInDegree.forEach(([path, count]) => {
        if (count >= HUB_FILE_IN_DEGREE_THRESHOLD) {
            if (!addedHubs.has(path)) {
                hubFiles.push(path);
                addedHubs.add(path);
            }
        }
    });

    // Add top N files if we still have room, ensuring they have at least 2 dependents
    for (const [path, count] of sortedByInDegree) {
        if (hubFiles.length >= MAX_HUB_FILES) {
            break;
        }
        if (!addedHubs.has(path) && count >= 2) {
            hubFiles.push(path);
            addedHubs.add(path);
        }
    }

    this.hubFiles = hubFiles;
  }


  /**
   * Gets the list of identified project hub files.
   * @returns An array of project-relative paths for hub files.
   */
  public getHubFiles(): string[] {
    return this.hubFiles;
  }

  /**
   * Gets the list of recently committed files.
   * @returns An array of project-relative paths for recently committed files.
   */
  public getRecentlyCommittedFiles(): string[] {
    return this.recentlyCommittedFiles;
  }

  /**
   * Gets the list of files mentioned within a given file.
   * @param filePath The project-relative path of the file to check.
   * @returns An array of project-relative paths of mentioned files.
   */
  public getMentionsForFile(filePath: string): string[] {
    return this.fileMentions.get(filePath) || [];
  }

  /**
   * Gets the list of dependencies for a given file.
   * @param filePath The project-relative path of the file.
   * @returns An array of dependency specifiers (not resolved paths).
   */
  public getDependenciesForFile(filePath: string): string[] {
    return this.dependencyGraph.get(filePath) || [];
  }
  
  /**
   * Gets the list of files that depend on (import) a given file.
   * @param filePath The project-relative path of the file.
   * @returns An array of project-relative paths of dependent files.
   * This list is based on resolved dependencies.
   */
  public getDependentsForFile(filePath: string): string[] {
    return this.dependentsGraph.get(filePath) || [];
  }

  /**
   * Gets the list of files that are frequently committed with the given file.
   * @param filePath The project-relative path of the file to check.
   * @returns An array of objects, each containing a peer file path and the shared commit count.
   */
  public getSharedCommitPeers(
    filePath: string
  ): { file: string; count: number }[] {
    return this.sharedCommitGraph.get(filePath) || [];
  }
}
