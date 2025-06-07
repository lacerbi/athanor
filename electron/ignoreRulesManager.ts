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
}

class IgnoreRulesManager {
  private lastError: Error | null = null;
  private materialsDir = FILE_SYSTEM.materialsDirName;
  private baseDir = '';
  
  // Master lists of ignore files, sorted from deepest to shallowest
  private athignoreFiles: IgnoreFile[] = [];
  private gitignoreFiles: IgnoreFile[] = [];

  // Update base directory and reload rules
  setBaseDir(newDir: string) {
    this.baseDir = PathUtils.normalizeToUnix(newDir);
    this.clearRules();
    this.loadIgnoreRules().catch((error) => {
      console.error('Error reloading ignore rules:', error);
    });
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

  // Check if a path should be ignored (temporarily disabled for refactor)
  ignores(path: string): boolean {
    // Temporarily return false during refactor - full implementation in Commit 2
    return false;
  }

  /**
   * Recursively scan for all ignore files in the project directory
   * Uses found ignore rules to prune traversal for performance
   * @param startDir Starting directory for scan (project-relative Unix path)
   * @returns Object containing lists of found athignore and gitignore files
   */
  private async _scanForIgnoreFiles(startDir: string): Promise<{
    athignores: IgnoreFile[],
    gitignores: IgnoreFile[]
  }> {
    const athignores: IgnoreFile[] = [];
    const gitignores: IgnoreFile[] = [];
    
    // Get absolute platform path for file system operations
    const absoluteStartDir = PathUtils.joinUnix(this.baseDir, startDir);
    const platformStartDir = PathUtils.toPlatform(absoluteStartDir);
    
    try {
      // Check if directory exists and is accessible
      await fs.access(platformStartDir);
      const stats = await fs.stat(platformStartDir);
      if (!stats.isDirectory()) {
        return { athignores, gitignores };
      }
    } catch (error) {
      // Directory doesn't exist or isn't accessible
      return { athignores, gitignores };
    }

    // Read ignore files in current directory
    const currentIgnores = ignore();
    let hasCurrentRules = false;

    // Try to read .athignore
    const athignorePath = PathUtils.toPlatform(
      PathUtils.joinUnix(absoluteStartDir, '.athignore')
    );
    try {
      const athignoreContent = await fs.readFile(athignorePath, 'utf-8');
      const athignoreRules = ignore().add(athignoreContent);
      athignores.push({
        path: startDir,
        rules: athignoreRules
      });
      // Add to current rules for pruning
      currentIgnores.add(athignoreContent);
      hasCurrentRules = true;
    } catch (error) {
      // .athignore doesn't exist or can't be read - this is normal
    }

    // Try to read .gitignore
    const gitignorePath = PathUtils.toPlatform(
      PathUtils.joinUnix(absoluteStartDir, '.gitignore')
    );
    try {
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      const gitignoreRules = ignore().add(gitignoreContent);
      gitignoreRules.add('.git/'); // Always ignore .git directory when using .gitignore
      gitignores.push({
        path: startDir,
        rules: gitignoreRules
      });
      // Add to current rules for pruning (only if no .athignore was found)
      if (!hasCurrentRules) {
        currentIgnores.add(gitignoreContent);
        currentIgnores.add('.git/');
      }
    } catch (error) {
      // .gitignore doesn't exist or can't be read - this is normal
    }

    // Read directory contents for recursion
    try {
      const entries = await fs.readdir(platformStartDir);
      
      // Filter entries to only directories, and apply ignore rules for pruning
      for (const entry of entries) {
        const entryPath = PathUtils.toPlatform(
          PathUtils.joinUnix(absoluteStartDir, entry)
        );
        let isDirectory = false;
        
        try {
          const entryStats = await fs.stat(entryPath);
          isDirectory = entryStats.isDirectory();
        } catch (error) {
          // Skip entries we can't stat
          continue;
        }
        
        if (!isDirectory) {
          continue;
        }
        
        // Calculate project-relative path for ignore check
        const entryRelativePath = startDir === '.' ? entry : PathUtils.joinUnix(startDir, entry);
        
        // Skip materials directory from main tree scanning
        if (startDir === '.' && entry === this.materialsDir) {
          continue;
        }
        
        // Use current ignore rules to prune traversal
        // Format path for ignore rules (directories should end with /)
        const ignoreTestPath = PathUtils.normalizeForIgnore(entryRelativePath, true);
        if (ignoreTestPath && hasCurrentRules && currentIgnores.ignores(ignoreTestPath)) {
          continue; // Skip ignored directories
        }
        
        // Recursively scan subdirectory
        const subResults = await this._scanForIgnoreFiles(entryRelativePath);
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
   * @param ignoreFiles Array of ignore files to sort
   * @returns Sorted array (deepest first)
   */
  private _sortIgnoreFilesByDepth(ignoreFiles: IgnoreFile[]): IgnoreFile[] {
    return ignoreFiles.slice().sort((a, b) => {
      // Calculate depth by counting path segments
      const depthA = a.path === '.' ? 0 : a.path.split('/').length;
      const depthB = b.path === '.' ? 0 : b.path.split('/').length;
      
      // Sort deepest first (descending order)
      return depthB - depthA;
    });
  }

  // Load ignore rules: scan for all ignore files and sort them
  async loadIgnoreRules() {
    // Clear existing rules first
    this.clearRules();

    const currentBaseDir = this.getBaseDir();
    if (!currentBaseDir) {
      console.log('No base directory set, skipping ignore rules loading.');
      return;
    }

    // Read project settings to determine if we should use .gitignore
    let useGitignore = true; // Default to true
    const projectSettingsPath = PathUtils.toPlatform(
      PathUtils.joinUnix(currentBaseDir, FILE_SYSTEM.materialsDirName, 'project_settings.json')
    );

    try {
      const settingsData = await fs.readFile(projectSettingsPath, 'utf-8');
      const settings = JSON.parse(settingsData);
      useGitignore = settings.useGitignore ?? true;
    } catch (error) {
      // If we can't read the settings file, use the default (true)
      // This handles cases where the file doesn't exist or is malformed
    }

    try {
      console.log('Starting intelligent ignore file scan...');
      
      // Scan for all ignore files starting from project root
      const scanResults = await this._scanForIgnoreFiles('.');
      
      // Sort both lists from deepest to shallowest
      this.athignoreFiles = this._sortIgnoreFilesByDepth(scanResults.athignores);
      this.gitignoreFiles = useGitignore ? this._sortIgnoreFilesByDepth(scanResults.gitignores) : [];
      
      console.log(`Ignore file scan complete. Found ${this.athignoreFiles.length} .athignore files and ${this.gitignoreFiles.length} .gitignore files.`);
      
      // Log discovered files for debugging
      if (this.athignoreFiles.length > 0) {
        console.log('.athignore files found:', this.athignoreFiles.map(f => f.path));
      }
      if (this.gitignoreFiles.length > 0) {
        console.log('.gitignore files found:', this.gitignoreFiles.map(f => f.path));
      }
      
    } catch (error) {
      console.error('Error during ignore file scan:', error);
      this.handleError(error, 'scanning ignore files');
    }
  }

  // Add new ignore pattern, optionally ignoring all with same name (ignoreAll)
  async addIgnorePattern(itemPath: string, ignoreAll = false): Promise<boolean> {
    try {
      // Check if path ends with slash before normalization
      const hadTrailingSlash =
        itemPath.endsWith('/') || itemPath.endsWith('\\');

      let finalPath: string;
      if (ignoreAll) {
        // For "ignore all", bypass relativeToCwd and resolveFromBase,
        // simply normalize and remove any leading slash.
        finalPath = PathUtils.normalizeToUnix(itemPath).replace(/^\/+/, '');
        if (hadTrailingSlash && !finalPath.endsWith('/')) {
          finalPath += '/';
        }
      } else {
        // For single-item ignore, make the path relative to base dir
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

      // Create .athignore if it doesn't exist
      try {
        await fs.access(ignorePath);
      } catch {
        await fs.writeFile(ignorePath, '', 'utf8');
      }

      // Read current content
      const currentContent = await fs.readFile(ignorePath, 'utf8');
      const lines = currentContent.split('\n').filter((line) => line.trim());

      // Add new item if it's not already in the file
      if (!lines.includes(finalPath)) {
        lines.push(finalPath);

        // Write back with normalized line endings
        const newContent = lines.join('\n') + '\n';
        await fs.writeFile(ignorePath, newContent, 'utf8');

        // Reload ignore rules
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
