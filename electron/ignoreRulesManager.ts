// AI Summary: Manages ignore rules including loading from .athignore/.gitignore files,
// rule application, and path normalization. Now ensures single-item ignores are prefixed
// with a leading slash in .athignore when ignoreAll is false.

import * as path from 'path';
import * as fs from 'fs/promises';
import ignore from 'ignore';
import { FILE_SYSTEM } from '../src/utils/constants';
import { filePathManager } from './filePathManager';

class IgnoreRulesManager {
  private ig = ignore();
  private lastError: Error | null = null;
  private materialsDir = FILE_SYSTEM.materialsDirName;

  // Update base directory and reload rules
  setBaseDir(newDir: string) {
    filePathManager.setBaseDir(newDir);
    this.clearRules();
    this.loadIgnoreRules().catch((error) => {
      console.error('Error reloading ignore rules:', error);
    });
  }

  // Get current base directory
  getBaseDir(): string {
    return filePathManager.getBaseDir();
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

  // Load .athignore if it exists, fallback to .gitignore
  async loadIgnoreRules() {
    // Clear existing rules first
    this.clearRules();

    const currentBaseDir = this.getBaseDir();
    const platformBaseDir = filePathManager.toPlatformPath(currentBaseDir);

    // Try .athignore first
    const athignorePath = path.join(platformBaseDir, '.athignore');
    try {
      const data = await fs.readFile(athignorePath, 'utf-8');
      this.ig.add(data);
      console.log('.athignore rules loaded from:', athignorePath);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Error reading .athignore:', error);
        this.handleError(error, 'reading .athignore');
        return;
      }
      // .athignore not found, try .gitignore
      const gitignorePath = path.join(platformBaseDir, '.gitignore');
      try {
        const data = await fs.readFile(gitignorePath, 'utf-8');
        this.ig.add(data);
        // Always add .git directory when using .gitignore
        this.ig.add('.git/');
        console.log(
          '.gitignore rules loaded with .git directory excluded from:',
          gitignorePath
        );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          console.log('No ignore files found. No ignore rules applied.');
        } else {
          console.error('Error reading .gitignore:', error);
          this.handleError(error, 'reading .gitignore');
        }
      }
    }
  }

  // Add new ignore pattern, optionally ignoring all with same name (ignoreAll)
  async addIgnorePattern(itemPath: string, ignoreAll = false): Promise<boolean> {
    try {
      // Check if path ends with slash before normalization
      const hadTrailingSlash =
        itemPath.endsWith('/') || itemPath.endsWith('\\');

      // Normalize and ensure path is relative to base directory
      const normalizedPath = filePathManager.relativeToCwd(
        filePathManager.resolveFromBase(
          filePathManager.normalizeToUnix(itemPath)
        )
      );

      // Restore the trailing slash if it was present
      let finalPath = hadTrailingSlash
        ? normalizedPath + '/'
        : normalizedPath;

      // If ignoring a single file/folder, prepend slash to make it root-relative
      if (!ignoreAll && !finalPath.startsWith('/')) {
        finalPath = '/' + finalPath;
      }

      const ignorePath = filePathManager.toPlatformPath(
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
