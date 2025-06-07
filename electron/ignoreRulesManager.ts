// AI Summary: Manages ignore rules including loading from .athignore/.gitignore files,
// rule application, and path normalization. Now ensures that when ignoreAll is true,
// the provided path is directly normalized and stripped of any leading slash, so that
// ignore-all entries in .athignore appear without a leading slash. Single-item ignores
// still get a leading slash.
import * as path from 'path';
import * as fs from 'fs/promises';
import ignore from 'ignore';
import { FILE_SYSTEM } from '../src/utils/constants';
import { PathUtils } from './services/PathUtils';

class IgnoreRulesManager {
  private ig = ignore();
  private lastError: Error | null = null;
  private materialsDir = FILE_SYSTEM.materialsDirName;
  private baseDir = '';

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
    this.ig = ignore();
    console.log('Ignore rules cleared.');
  }

  // Check if a path should be ignored
  ignores(path: string): boolean {
    return this.ig.ignores(path);
  }

  // Load ignore rules: .gitignore (if enabled) then .athignore (for overrides)
  async loadIgnoreRules() {
    // Clear existing rules first
    this.clearRules();

    const currentBaseDir = this.getBaseDir();
    const platformBaseDir = PathUtils.toPlatform(currentBaseDir);

    // Read project settings to determine if we should use .gitignore
    let useGitignore = true; // Default to true
    const projectSettingsPath = path.join(
      platformBaseDir,
      FILE_SYSTEM.materialsDirName,
      'project_settings.json'
    );

    try {
      const settingsData = await fs.readFile(projectSettingsPath, 'utf-8');
      const settings = JSON.parse(settingsData);
      useGitignore = settings.useGitignore ?? true;
    } catch (error) {
      // If we can't read the settings file, use the default (true)
      // This handles cases where the file doesn't exist or is malformed
    }

    // Load .gitignore if enabled
    if (useGitignore) {
      const gitignorePath = path.join(platformBaseDir, '.gitignore');
      try {
        const data = await fs.readFile(gitignorePath, 'utf-8');
        this.ig.add(data);
        // Always add .git directory when using .gitignore
        this.ig.add('.git/');
        console.log('.gitignore rules loaded from:', gitignorePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          console.log('No .gitignore file found.');
        } else {
          console.error('Error reading .gitignore:', error);
          this.handleError(error, 'reading .gitignore');
        }
      }
    }

    // Always load .athignore last for overrides
    const athignorePath = path.join(platformBaseDir, '.athignore');
    try {
      const data = await fs.readFile(athignorePath, 'utf-8');
      this.ig.add(data);
      console.log('.athignore rules loaded from:', athignorePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('No .athignore file found.');
      } else {
        console.error('Error reading .athignore:', error);
        this.handleError(error, 'reading .athignore');
      }
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
        path.join(this.getBaseDir(), '.athignore')
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
