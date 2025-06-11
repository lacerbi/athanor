// AI Summary: Manages nested ignore rules including intelligent discovery of all .athignore/.gitignore files,
// rule application with "Athanor-First" precedence, and performance-optimized traversal that uses found rules
// to prune directory scanning. Implements Git-like nested ignore behavior with comprehensive override capabilities.

import * as path from 'path';
import * as fs from 'fs/promises';
import ignore from 'ignore';
import { FILE_SYSTEM } from '../src/utils/constants';
import { PathUtils } from './services/PathUtils';

/**
 * Represents an ignore file with its location and parsed rules
 */
interface IgnoreFile {
  /** Directory path containing the ignore file (project-relative Unix path) */
  path: string;
  /** Parsed ignore rules using the ignore library */
  rules: ignore.Ignore;
  /** Raw content of the ignore file */
  content: string;
}

/**
 * IgnoreRulesManager implements a sophisticated "Deepest Opinion Wins" algorithm
 * for handling hierarchical ignore rules with Athanor's two-tier precedence system.
 * 
 * ## Algorithm Overview: "Deepest Opinion Wins"
 * 
 * This system perfectly emulates Git's hierarchical ignore behavior while adding
 * Athanor's specific two-tier precedence. The core principle is simple but powerful:
 * when checking if a path should be ignored, the deepest relevant ignore file that
 * has any opinion about that path gets the final say.
 * 
 * ## Two-Tier Precedence System
 * 
 * The algorithm operates in two distinct tiers, checked in order:
 * 
 * **Tier 1: .athignore files (Primary)**
 * - These files have absolute highest precedence
 * - If ANY .athignore file in the hierarchy has an opinion about a path, that decision is FINAL
 * - No .gitignore rules are even consulted if Tier 1 provides an answer
 * 
 * **Tier 2: .gitignore files (Secondary)**
 * - Only consulted if Tier 1 had no opinion AND useGitignore setting is true
 * - Follows the same "deepest opinion wins" logic within this tier
 * 
 * ## Hierarchical Logic Within Each Tier
 * 
 * Within each tier, the algorithm:
 * 1. Identifies all ignore files that are ancestors of the path being checked
 * 2. Sorts these files from deepest to shallowest (by directory depth)
 * 3. Iterates through them, starting with the deepest
 * 4. For each file, calculates the path relative to that file's directory
 * 5. Checks if that file's rules have any opinion about the relative path
 * 6. STOPS at the first file that has an opinion and returns that verdict
 * 
 * ## Path Relativity
 * 
 * This is crucial for correct behavior. Each ignore file's rules are applied
 * relative to that file's directory. For example:
 * - `/src/.gitignore` containing "build" only affects `/src/build/`, not `/build/`
 * - `/src/components/.athignore` containing "*.test.js" only affects test files in `/src/components/`
 * 
 * ## Examples
 * 
 * ### Example 1: Child Override (Git-style)
 * ```
 * /.gitignore: "*.log"          (ignores all .log files)
 * /src/.gitignore: "!important.log"  (un-ignores important.log in src/)
 * 
 * Check: src/important.log
 * - /src/.gitignore is deeper and has opinion "!important.log" → NOT IGNORED
 * - /.gitignore never consulted because deeper file had opinion
 * ```
 * 
 * ### Example 2: Athanor Precedence
 * ```
 * /.gitignore: "config.json"    (ignore config.json)
 * /.athignore: "!config.json"   (un-ignore config.json)
 * 
 * Check: config.json
 * - Tier 1 (.athignore): Has opinion "!config.json" → NOT IGNORED
 * - Tier 2 (.gitignore): Never consulted because Tier 1 had opinion
 * ```
 * 
 * ### Example 3: No Opinion Fallback
 * ```
 * /.athignore: "*.log"          (only cares about .log files)
 * /.gitignore: "*.tmp"          (only cares about .tmp files)
 * 
 * Check: file.tmp
 * - Tier 1 (.athignore): No opinion on .tmp files → returns null
 * - Tier 2 (.gitignore): Has opinion "*.tmp" → IGNORED
 * ```
 * 
 * ## Key Benefits
 * 
 * 1. **Predictable**: The deepest file always wins, making behavior intuitive
 * 2. **Git-compatible**: Perfectly emulates Git's ignore hierarchy within each tier
 * 3. **Performance**: Stops at first opinion found, no need to accumulate rules
 * 4. **Flexible**: Athanor files can override any Git rules at any level
 * 5. **Path-relative**: Each ignore file only affects its own subtree
 * 
 * ## Implementation Notes
 * 
 * - All ignore files are discovered via intelligent scanning during loadIgnoreRules()
 * - Files are pre-sorted by depth (deepest first) for efficient iteration
 * - The `ignore` library handles the actual pattern matching
 * - Path normalization ensures consistent Unix-style paths throughout
 * - The useGitignore setting can completely disable Tier 2
 */
class IgnoreRulesManager {
  private lastError: Error | null = null;
  private materialsDir = FILE_SYSTEM.materialsDirName;
  private baseDir = '';
  private lastLoadTime = 0;
  
  // Master lists of ignore files, sorted from deepest to shallowest
  private athignoreFiles: IgnoreFile[] = [];
  private gitignoreFiles: IgnoreFile[] = [];
  private useGitignore = true;

  // Update base directory and reload rules
  async setBaseDir(newDir: string) {
    this.baseDir = PathUtils.normalizeToUnix(newDir);
    this.clearRules();
    await this.loadIgnoreRules();
  }

  // Get current base directory
  getBaseDir(): string {
    return this.baseDir;
  }

  // Clear existing ignore rules
  clearRules() {
    this.athignoreFiles = [];
    this.gitignoreFiles = [];
    console.log('Ignore rules cleared.');
  }

  /**
   * Check if a path should be ignored based on loaded .athignore and .gitignore rules.
   * Uses the "Deepest Opinion Wins" algorithm with two-tier precedence:
   * 1. First check .athignore hierarchy (Tier 1) - if any file has an opinion, that's final
   * 2. Only if Tier 1 has no opinion, check .gitignore hierarchy (Tier 2)
   * 
   * @param pathToCheck The project-relative path to check.
   * @returns True if the path should be ignored, false otherwise.
   */
  ignores(pathToCheck: string): boolean {
    // Handle invalid input gracefully
    if (!pathToCheck || typeof pathToCheck !== 'string') {
      return false;
    }

    // Normalize the path for ignore rule processing
    const isDir = pathToCheck.endsWith('/');
    const normalizedPath = PathUtils.normalizeForIgnore(pathToCheck, isDir);
    if (!normalizedPath) {
      return false;
    }

    // Tier 1: Check .athignore files first (highest precedence)
    const athResult = this._checkHierarchy(normalizedPath, this.athignoreFiles);
    if (athResult !== null) {
      return athResult; // .athignore hierarchy had a definitive opinion - we're done
    }

    // Tier 2: Only check .gitignore if Tier 1 had no opinion and gitignore is enabled
    if (!this.useGitignore) {
      return false;
    }

    const gitResult = this._checkHierarchy(normalizedPath, this.gitignoreFiles);
    return gitResult ?? false; // Default to not ignored if no opinion found
  }

  /**
   * Core helper implementing the "Deepest Opinion Wins" algorithm.
   * Checks a hierarchy of ignore files (either .athignore or .gitignore) to determine
   * if a path should be ignored. The deepest relevant ignore file that has an opinion wins.
   * 
   * @param pathToCheck Normalized path to check (project-relative)
   * @param files Array of ignore files, must be sorted deepest to shallowest
   * @returns true if ignored, false if not ignored, null if no file had an opinion
   */
  private _checkHierarchy(pathToCheck: string, files: IgnoreFile[]): boolean | null {
    // Find all ignore files that are ancestors of the path being checked
    const ancestors = PathUtils.getAncestors(pathToCheck);
    const relevantFiles = files.filter(file => ancestors.includes(file.path));

    // Iterate through relevant files (already sorted deepest to shallowest)
    for (const file of relevantFiles) {
      // Calculate the path relative to this ignore file's directory
      const relativePath = file.path === '.' 
        ? pathToCheck 
        : PathUtils.relative(file.path, pathToCheck);

      if (!relativePath) {
        continue; // Skip if we can't calculate a valid relative path
      }

      // Create a checker with only this file's rules
      const checker = ignore().add(file.content);
      
      // Test if this file has any opinion about the path
      const result = checker.test(relativePath);
      
      // If this file has an opinion (either ignore or unignore), that's our answer
      if (result.ignored || result.unignored) {
        // The deepest file with an opinion wins - return the final verdict
        return checker.ignores(relativePath);
      }
    }

    // No file in this hierarchy had an opinion about the path
    return null;
  }

  /**
   * Helper method to read and parse a single ignore file
   */
  private async _readIgnoreFile(absolutePath: string, isGitignore = false): Promise<Pick<IgnoreFile, 'rules' | 'content'> | null> {
    try {
      const content = await fs.readFile(PathUtils.toPlatform(absolutePath), 'utf-8');
      const rules = ignore().add(content);
      if (isGitignore) {
        rules.add('.git/');
      }
      return { rules, content };
    } catch (error) {
      return null;
    }
  }

  /**
   * Recursively scan for all ignore files in the project directory
   */
  private async _scanForIgnoreFiles(
    startDir: string, 
    useGitignore: boolean, 
    pruningRules?: ignore.Ignore
  ): Promise<{
    athignores: IgnoreFile[],
    gitignores: IgnoreFile[]
  }> {
    const athignores: IgnoreFile[] = [];
    const gitignores: IgnoreFile[] = [];
    
    const absoluteStartDir =
      startDir === '.' ? this.baseDir : PathUtils.joinUnix(this.baseDir, startDir);
    if (!absoluteStartDir) return { athignores: [], gitignores: [] };
    const platformStartDir = PathUtils.toPlatform(absoluteStartDir);
    
    try {
      await fs.access(platformStartDir);
      const stats = await fs.stat(platformStartDir);
      if (!stats.isDirectory()) {
        return { athignores, gitignores };
      }
    } catch (error) {
      return { athignores, gitignores };
    }

    const currentIgnores = ignore();
    let hasCurrentRules = false;

    const athignorePath = PathUtils.joinUnix(absoluteStartDir, '.athignore');
    const athignoreData = await this._readIgnoreFile(athignorePath);
    if (athignoreData) {
      athignores.push({
        path: startDir,
        rules: athignoreData.rules,
        content: athignoreData.content,
      });
      currentIgnores.add(athignoreData.rules);
      hasCurrentRules = true;
    }

    if (useGitignore) {
      const gitignorePath = PathUtils.joinUnix(absoluteStartDir, '.gitignore');
      const gitignoreData = await this._readIgnoreFile(gitignorePath, true);
      if (gitignoreData) {
        gitignores.push({
          path: startDir,
          rules: gitignoreData.rules,
          content: gitignoreData.content
        });
        if (!hasCurrentRules) {
          currentIgnores.add(gitignoreData.rules);
        }
      }
    }

    try {
      const entries = await fs.readdir(platformStartDir);
      
      for (const entry of entries) {
        const entryPath = PathUtils.toPlatform(
          PathUtils.joinUnix(absoluteStartDir, entry)
        );
        let isDirectory = false;
        
        try {
          const entryStats = await fs.stat(entryPath);
          isDirectory = entryStats.isDirectory();
        } catch (error) {
          continue;
        }
        
        if (!isDirectory) {
          continue;
        }
        
        const entryRelativePath = startDir === '.' ? entry : PathUtils.joinUnix(startDir, entry);
        
        if (startDir === '.' && entry === this.materialsDir) {
          continue;
        }
        
        const ignoreTestPath = PathUtils.normalizeForIgnore(entryRelativePath, true);
        if (ignoreTestPath) {
          if (pruningRules && pruningRules.ignores(ignoreTestPath)) {
            continue;
          }
          if (hasCurrentRules && currentIgnores.ignores(ignoreTestPath)) {
            continue;
          }
        }
        
        const subResults = await this._scanForIgnoreFiles(entryRelativePath, useGitignore, pruningRules);
        athignores.push(...subResults.athignores);
        gitignores.push(...subResults.gitignores);
      }
    } catch (error) {
      console.warn(`Error reading directory ${startDir}:`, error);
    }

    return { athignores, gitignores };
  }

  /**
   * Sort ignore files by directory depth, from deepest to shallowest
   */
  private _sortIgnoreFilesByDepth(ignoreFiles: IgnoreFile[]): IgnoreFile[] {
    return ignoreFiles.slice().sort((a, b) => {
      const depthA = a.path === '.' ? 0 : a.path.split('/').length;
      const depthB = b.path === '.' ? 0 : b.path.split('/').length;
      
      return depthB - depthA;
    });
  }

  // Load ignore rules: scan for all ignore files and sort them
  async loadIgnoreRules() {
    const now = Date.now();
    if (now - this.lastLoadTime < 500) {
      return; // Debounce subsequent calls within 500ms
    }
    this.lastLoadTime = now;

    this.clearRules();

    const currentBaseDir = this.getBaseDir();
    if (!currentBaseDir) {
      return;
    }

    this.useGitignore = true;
    const projectSettingsPath = PathUtils.toPlatform(
      PathUtils.joinUnix(currentBaseDir, FILE_SYSTEM.materialsDirName, 'project_settings.json')
    );

    try {
      const raw = await fs.readFile(projectSettingsPath, 'utf-8');
      try {
        const cfg = JSON.parse(raw);
        this.useGitignore = cfg.useGitignore ?? true;
      } catch (parseErr) {
        console.warn('[ignoreRulesManager] Malformed project_settings.json – skipping ignore scan');
        return;
      }
    } catch (readErr: any) {
      if (readErr.code && readErr.code !== 'ENOENT') {
        console.warn('[ignoreRulesManager] Cannot read project settings – skipping ignore scan');
        return;
      }
    }

    try {
      const rootPruningRules = ignore();
      let hasRootRules = false;

      const rootAthignorePath = PathUtils.joinUnix(currentBaseDir, '.athignore');
      const rootAthignoreData = await this._readIgnoreFile(rootAthignorePath);
      if (rootAthignoreData) {
        rootPruningRules.add(rootAthignoreData.rules);
        hasRootRules = true;
      }

      if (this.useGitignore) {
        const rootGitignorePath = PathUtils.joinUnix(currentBaseDir, '.gitignore');
        const rootGitignoreData = await this._readIgnoreFile(rootGitignorePath, true);
        if (rootGitignoreData) {
          if (!hasRootRules) {
            rootPruningRules.add(rootGitignoreData.rules);
          }
        }
      }

      const scanResults = await this._scanForIgnoreFiles('.', this.useGitignore, hasRootRules ? rootPruningRules : undefined);
      
      this.athignoreFiles = this._sortIgnoreFilesByDepth(scanResults.athignores);
      this.gitignoreFiles = this.useGitignore ? this._sortIgnoreFilesByDepth(scanResults.gitignores) : [];
      
      console.log(`Ignore file scan complete. Found ${this.athignoreFiles.length} .athignore files and ${this.gitignoreFiles.length} .gitignore files.`);
    } catch (error) {
      console.error('Error during ignore file scan:', error);
      this.handleError(error, 'scanning ignore files');
    }
  }

  // Add new ignore pattern, optionally ignoring all with same name (ignoreAll)
  async addIgnorePattern(itemPath: string, ignoreAll = false): Promise<boolean> {
    try {
      const hadTrailingSlash =
        itemPath.endsWith('/') || itemPath.endsWith('\\');

      let finalPath: string;
      if (ignoreAll) {
        finalPath = PathUtils.normalizeToUnix(itemPath).replace(/^\/+/, '');
        if (hadTrailingSlash && !finalPath.endsWith('/')) {
          finalPath += '/';
        }
      } else {
        const fullPath = PathUtils.joinUnix(this.baseDir, PathUtils.normalizeToUnix(itemPath));
        const normalizedPath = PathUtils.relative(this.baseDir, fullPath);
        
        finalPath = hadTrailingSlash ? normalizedPath + '/' : normalizedPath;
        if (!finalPath.startsWith('/')) {
          finalPath = '/' + finalPath;
        }
      }

      const ignorePath = PathUtils.toPlatform(
        PathUtils.joinUnix(this.getBaseDir(), '.athignore')
      );

      try {
        await fs.access(ignorePath);
      } catch {
        await fs.writeFile(ignorePath, '', 'utf8');
      }

      const currentContent = await fs.readFile(ignorePath, 'utf8');
      const lines = currentContent.split('\n').filter((line) => line.trim());

      if (!lines.includes(finalPath)) {
        lines.push(finalPath);

        const newContent = lines.join('\n') + '\n';
        await fs.writeFile(ignorePath, newContent, 'utf8');

        await this.loadIgnoreRules();

        return true;
      }

      return false;
    } catch (error) {
      this.handleError(error, `adding to ignore file: ${itemPath}`);
      return false;
    }
  }

  // Enhanced error handling with state tracking
  private handleError(error: unknown, operation: string): never {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    this.lastError = errorObj;
    console.error(`Error during ${operation}:`, error);
    throw errorObj;
  }

  // Get last error if any
  getLastError(): Error | null {
    return this.lastError;
  }

  // Clear error state
  clearError(): void {
    this.lastError = null;
  }
}

// Export singleton instance
export const ignoreRulesManager = new IgnoreRulesManager();
