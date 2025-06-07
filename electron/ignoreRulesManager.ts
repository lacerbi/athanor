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

class IgnoreRulesManager {
  private lastError: Error | null = null;
  private materialsDir = FILE_SYSTEM.materialsDirName;
  private baseDir = '';
  
  // Master lists of ignore files, sorted from deepest to shallowest
  private athignoreFiles: IgnoreFile[] = [];
  private gitignoreFiles: IgnoreFile[] = [];
  private useGitignore = true;

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

  /**
   * Check if a path should be ignored based on loaded .athignore and .gitignore rules.
   * @param pathToCheck The project-relative path to check.
   * @returns True if the path should be ignored, false otherwise.
   */
  ignores(pathToCheck: string): boolean {
    const isDir = pathToCheck.endsWith('/');
    const normalizedPath = PathUtils.normalizeForIgnore(pathToCheck, isDir);
    if (!normalizedPath) {
      return false;
    }
    const ancestors = PathUtils.getAncestors(normalizedPath);

    const check = (files: IgnoreFile[], parentFiles: IgnoreFile[] = []): boolean | null => {
      const relevantFiles = files.filter(f => ancestors.includes(f.path));

      for (const file of relevantFiles) { // Deepest to shallowest
        const checker = ignore();

        // Get all parent files for context (both ath and git)
        const allParents = [
          ...parentFiles.filter(p => file.path.startsWith(p.path) && file.path !== p.path),
          ...files.filter(p => file.path.startsWith(p.path) && file.path !== p.path),
        ];
        allParents.sort((a, b) => a.path.split('/').length - b.path.split('/').length);

        for(const parentFile of allParents) {
          checker.add(parentFile.content);
        }
        
        // Add the current file's rules last to give them precedence
        checker.add(file.content);

        const pathRelativeToBase = PathUtils.relative(this.baseDir, PathUtils.joinUnix(this.baseDir, normalizedPath));
        const originalResult = checker.test(pathRelativeToBase);

        // Now check if this specific file's rules made a difference
        const checkerWithoutCurrent = ignore();
        for(const parentFile of allParents) {
          checkerWithoutCurrent.add(parentFile.content);
        }
        const parentResult = checkerWithoutCurrent.test(pathRelativeToBase);
        
        // If the result changed after adding the current file's rules, it has an opinion.
        if (originalResult.ignored !== parentResult.ignored || originalResult.unignored !== parentResult.unignored) {
          return !originalResult.unignored;
        }
      }
      return null;
    };

    // Tier 1: .athignore
    const athResult = check(this.athignoreFiles, this.useGitignore ? this.gitignoreFiles : []);
    if (athResult !== null) {
      return athResult;
    }

    // Tier 2: .gitignore
    if (this.useGitignore) {
      const gitResult = check(this.gitignoreFiles);
      if (gitResult !== null) {
        return gitResult;
      }
    }
    
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
