// AI Summary: Manages nested ignore rules including intelligent discovery of all .athignore/.gitignore files,
// rule application with "Athanor-First" precedence, and performance-optimized traversal that uses found rules
// to prune directory scanning. Implements Git-like nested ignore behavior with comprehensive override capabilities.

import * as path from 'path';
import * as fs from 'fs/promises';
import ignore from 'ignore';
import { FILE_SYSTEM, SETTINGS } from '../src/utils/constants';
import { PathUtils } from './services/PathUtils';

// Configuration constants
const IGNORE_RULES_DEBOUNCE_MS = 500;

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
 * ## Algorithm Overview: Pre-compiled Rulesets
 * 
 * To solve performance issues, this system uses a two-stage process. First, it discovers
 * all ignore files in the project. Second, it compiles their rules into master rulesets.
 * This makes checking if a file is ignored extremely fast.
 * 
 * ## Two-Tier Precedence System
 * 
 * The algorithm operates in two distinct tiers, checked in order:
 * 
 * **Tier 1: .athignore files (Primary)**
 * - These files have absolute highest precedence.
 * - If the master .athignore ruleset has an opinion, that decision is FINAL.
 * 
 * **Tier 2: .gitignore files (Secondary)**
 * - Only consulted if Tier 1 had no opinion AND useGitignore setting is true.
 * 
 * ## Compilation and Override Logic
 *
 * - During `loadIgnoreRules()`, all found ignore files are sorted from shallowest to deepest.
 * - Their contents are added to the master `athIgnoreRules` and `gitIgnoreRules` instances in that order.
 * - The `ignore` library ensures that later rules (from deeper files) correctly override earlier ones from parent directories.
 * - This moves the computational complexity from check-time to a one-time load-time operation.
 *
 * ## Path Relativity
 *
 * For performance, this implementation deviates from Git's perfect path-relative behavior. All ignore patterns
 * are treated as if they are in the root directory. For example, a rule `build/` in `src/.gitignore` will be treated
 * as a root-level rule, potentially ignoring a `/build` directory. This is a trade-off for the massive
 * performance gain that solves `EMFILE` errors and application hangs. The most critical rules (e.g., for `node_modules`)
 * are typically in the root `.gitignore` and are unaffected.
 */
class IgnoreRulesManager {
  private lastError: Error | null = null;
  private materialsDir = FILE_SYSTEM.materialsDirName;
  private baseDir = '';
  private lastLoadTime = 0;
  
  // Master compiled rulesets
  private athIgnoreRules: ignore.Ignore = ignore();
  private gitIgnoreRules: ignore.Ignore = ignore();
  private useGitignore = SETTINGS.defaults.project.useGitignore;
  
  // State tracking flags for debugging
  private athRulesLoaded = false;
  private gitRulesLoaded = false;

  // Update base directory and reload rules
  async setBaseDir(newDir: string) {
    this.baseDir = PathUtils.normalizeToUnix(newDir);
    await this.loadIgnoreRules();
  }

  // Get current base directory
  getBaseDir(): string {
    return this.baseDir;
  }

  // Clear existing ignore rules
  clearRules() {
    this.athIgnoreRules = ignore();
    this.gitIgnoreRules = ignore();
    this.athRulesLoaded = false;
    this.gitRulesLoaded = false;
    console.log('Ignore rules cleared.');
  }

  /**
   * Check if a path should be ignored using pre-compiled rulesets.
   * It respects the two-tier precedence: .athignore rules are final if they
   * have an opinion; otherwise, .gitignore rules are consulted.
   *
   * @param pathToCheck The project-relative path to check. Must be normalized for ignore checks (e.g., with a trailing slash for directories).
   * @returns True if the path should be ignored, false otherwise.
   */
  ignores(pathToCheck: string): boolean {
    if (!pathToCheck || typeof pathToCheck !== 'string') {
      return false; // Invalid input
    }

    const normalizedPath = PathUtils.normalizeForIgnore(
      pathToCheck,
      pathToCheck.endsWith('/')
    );
    if (!normalizedPath) {
      return false;
    }

    // Tier 1: Check .athignore rules first (highest precedence)
  	// The .test() method returns {ignored: boolean, unignored: boolean},
  	// allowing us to see if any rule had an opinion.
    const athResult = this.athIgnoreRules.test(normalizedPath);
    if (athResult.ignored || athResult.unignored) {
      // An .athignore rule matched. This decision is final.
      return athResult.ignored;
    }

  	// Tier 2: Check .gitignore if enabled and Tier 1 had no opinion.
    if (this.useGitignore) {
      // We can use the simpler .ignores() here as there's no third tier.
      return this.gitIgnoreRules.ignores(normalizedPath);
    }

  	// Default: not ignored if no rules match.
    return false;
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
        // This catch is for basic directory access and can remain silent
        return { athignores, gitignores };
    }

    const currentIgnores = ignore();
    let hasCurrentRules = false;

    try {
        const entries = await fs.readdir(platformStartDir);

        // Check for .athignore and read it if it exists
        if (entries.includes('.athignore')) {
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
        }

        // Check for .gitignore and read it if it exists
        if (useGitignore && entries.includes('.gitignore')) {
            const gitignorePath = PathUtils.joinUnix(absoluteStartDir, '.gitignore');
            const gitignoreData = await this._readIgnoreFile(gitignorePath, true);
            if (gitignoreData) {
                gitignores.push({
                    path: startDir,
                    rules: gitignoreData.rules,
                    content: gitignoreData.content
                });
                // Add gitignore rules to the local pruner (`currentIgnores`) and ensure the
                // pruner is activated. This fixes a bug where local .gitignore files
                // were not used for pruning if a .athignore existed in the same directory.
                currentIgnores.add(gitignoreData.rules);
                hasCurrentRules = true;
            }
        }

        // Now, recurse into subdirectories
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
   * Sort ignore files by directory depth, from shallowest to deepest
   */
  private _sortIgnoreFilesByDepth(ignoreFiles: IgnoreFile[]): IgnoreFile[] {
    return ignoreFiles.slice().sort((a, b) => {
      const depthA = a.path === '.' ? 0 : a.path.split('/').length;
      const depthB = b.path === '.' ? 0 : b.path.split('/').length;
      
      return depthA - depthB;
    });
  }

  // Load ignore rules: scan for all ignore files and sort them
  async loadIgnoreRules() {
    const now = Date.now();
    if (now - this.lastLoadTime < IGNORE_RULES_DEBOUNCE_MS) {
      return; // Debounce subsequent calls within configured time
    }
    this.lastLoadTime = now;

    this.clearRules();

    const currentBaseDir = this.getBaseDir();
    if (!currentBaseDir) {
      return;
    }

    this.useGitignore = SETTINGS.defaults.project.useGitignore; // Start with the default value.
    const projectSettingsPath = PathUtils.toPlatform(
      PathUtils.joinUnix(currentBaseDir, FILE_SYSTEM.materialsDirName, 'project_settings.json')
    );

    try {
      const raw = await fs.readFile(projectSettingsPath, 'utf-8');
      const cfg = JSON.parse(raw);
      this.useGitignore = cfg.useGitignore ?? SETTINGS.defaults.project.useGitignore;
    } catch (error: any) {
      // If the file doesn't exist (ENOENT), that's fine; we just use defaults.
      // For any other error (parsing, permissions), we'll log a warning and proceed with defaults instead of halting.
      if (error.code !== 'ENOENT') {
        console.warn(`[ignoreRulesManager] Could not read or parse project_settings.json. Proceeding with default ignore settings. Error: ${error.message}`);
      }
    }

    try {
      // Stage 1: Discover all ignore files.
      // Use root-level ignore rules to prune the scan itself, which is a major performance win.
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
          // FIX: Add gitignore rules for pruning regardless of whether athignore exists.
          // This ensures that rules like `node_modules/` are always used for pruning,
          // fixing the primary cause of application hangs on project load.
          rootPruningRules.add(rootGitignoreData.rules);
          hasRootRules = true;
        }
      }

      const scanResults = await this._scanForIgnoreFiles('.', this.useGitignore, hasRootRules ? rootPruningRules : undefined);

      // Stage 2: Compile the rules.
      // Sort from shallowest to deepest for correct override behavior during compilation.
      const athignores = this._sortIgnoreFilesByDepth(scanResults.athignores);
      const gitignores = this.useGitignore ? this._sortIgnoreFilesByDepth(scanResults.gitignores) : [];

      // Add rules to the master instances. The `ignore` library handles overrides correctly
      // when rules are added in this shallow-to-deep order.
      athignores.forEach(file => this.athIgnoreRules.add(file.content));
      if (athignores.length > 0) this.athRulesLoaded = true;

      if (this.useGitignore) {
        gitignores.forEach(file => this.gitIgnoreRules.add(file.content));
        if (gitignores.length > 0) this.gitRulesLoaded = true;
      }

      console.log(`Ignore rule compilation complete. Processed ${athignores.length} .athignore files and ${gitignores.length} .gitignore files.`);
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
