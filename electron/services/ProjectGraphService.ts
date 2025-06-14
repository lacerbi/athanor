// AI Summary: Analyzes the project structure to build a dependency graph and file mention map.
// Identifies "hub files" with high in-degrees and provides methods to query relationships,
// supporting the RelevanceEngineService with deeper contextual insights.

import { FileService } from './FileService';
import { DependencyScanner } from './DependencyScanner';
import { PathUtils } from './PathUtils';

// Define a type for the cache data structure
interface ProjectGraphCache {
  dependencyGraph: [string, string[]][];
  dependentsGraph: [string, string[]][];
  fileMentions: [string, string[]][];
  hubFiles: string[];
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

  constructor(private readonly fileService: FileService) {}

  private getCachePath(): string {
    const materialsDir = this.fileService.getMaterialsDir();
    return this.fileService.join(materialsDir, CACHE_FILENAME);
  }

  async saveGraphToCache(): Promise<void> {
    try {
      const cachePath = this.getCachePath();
      const cacheData: ProjectGraphCache = {
        dependencyGraph: Array.from(this.dependencyGraph.entries()),
        dependentsGraph: Array.from(this.dependentsGraph.entries()),
        fileMentions: Array.from(this.fileMentions.entries()),
        hubFiles: this.hubFiles,
      };
      const jsonContent = JSON.stringify(cacheData, null, 2);
      await this.fileService.write(cachePath, jsonContent);
      console.log(
        `[ProjectGraphService] Successfully saved graph to cache at ${cachePath}`
      );
    } catch (error) {
      console.error('[ProjectGraphService] Failed to save graph to cache:', error);
    }
  }

  async loadGraphFromCache(): Promise<boolean> {
    const cachePath = this.getCachePath();
    if (!(await this.fileService.exists(cachePath))) {
      return false;
    }

    try {
      const jsonContent = (await this.fileService.read(cachePath, {
        encoding: 'utf-8',
      })) as string;
      const cacheData: ProjectGraphCache = JSON.parse(jsonContent);

      // Validate data before populating
      if (
        !cacheData ||
        !Array.isArray(cacheData.dependencyGraph) ||
        !Array.isArray(cacheData.dependentsGraph) ||
        !Array.isArray(cacheData.fileMentions) ||
        !Array.isArray(cacheData.hubFiles)
      ) {
        throw new Error('Invalid cache data format');
      }

      this.dependencyGraph = new Map(cacheData.dependencyGraph);
      this.dependentsGraph = new Map(cacheData.dependentsGraph);
      this.fileMentions = new Map(cacheData.fileMentions);
      this.hubFiles = cacheData.hubFiles;

      console.log(
        `[ProjectGraphService] Successfully loaded graph from cache at ${cachePath}`
      );
      return true;
    } catch (error) {
      console.error('[ProjectGraphService] Failed to load graph from cache:', error);
      // Clean up potentially corrupt cache file
      await this.fileService
        .remove(cachePath)
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

    // Save the results to cache
    await this.saveGraphToCache();

    console.log(
      `[ProjectGraphService] Analysis complete. Found ${this.hubFiles.length} hub files.`
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
          const resolvedPath = await this.resolveSimpleDependency(importerPath, specifier, allFilesSet);
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
    
    const potentialHubs = new Set<string>();

    // Add files that meet the absolute threshold
    sortedByInDegree.forEach(([path, count]) => {
        if (count >= HUB_FILE_IN_DEGREE_THRESHOLD) {
            potentialHubs.add(path);
        }
    });

    // Add top N files if we still have room, ensuring they have at least 2 dependents
    for (let i = 0; i < sortedByInDegree.length && potentialHubs.size < MAX_HUB_FILES; i++) {
        const [path, count] = sortedByInDegree[i];
        if (count >= 2) {
            potentialHubs.add(path);
        }
    }

    this.hubFiles = Array.from(potentialHubs);
  }

  /**
   * A simplified dependency resolver for graph building.
   * This is a simple heuristic and doesn't support complex pathing like aliases or node_modules.
   */
  private async resolveSimpleDependency(sourceFile: string, specifier: string, allFiles: Set<string>): Promise<string | null> {
    // For now, only handle relative paths as that's what DependencyScanner is good at.
    if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
        return null;
    }

    const sourceDir = PathUtils.dirname(sourceFile);
    const resolved = PathUtils.normalizeToUnix(PathUtils.joinUnix(sourceDir, specifier));

    // Check for exact match first
    if (allFiles.has(resolved)) return resolved;
    
    // Check with common extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss', '.py', '.java', '.go'];
    for (const ext of extensions) {
        const pathWithExt = `${resolved}${ext}`;
        if (allFiles.has(pathWithExt)) return pathWithExt;

        const indexPath = PathUtils.joinUnix(resolved, `index${ext}`);
        if (allFiles.has(indexPath)) return indexPath;
    }
    
    return null;
  }

  /**
   * Gets the list of identified project hub files.
   * @returns An array of project-relative paths for hub files.
   */
  public getHubFiles(): string[] {
    return this.hubFiles;
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
}
