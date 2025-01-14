// AI Summary: Manages ignore rules including loading from .athignore/.gitignore files,  
// rule application, and path normalization. Provides singleton instance for consistent 
// rule state across the application.
import * as path from 'path';
import * as fs from 'fs/promises';
import ignore from 'ignore';
import { FILE_SYSTEM } from '../src/utils/constants';

class IgnoreRulesManager {
  private ig = ignore();
  private baseDir: string = process.cwd();
  private lastError: Error | null = null;
  private resourcesDir = FILE_SYSTEM.resourcesDirName;

  // Update base directory and reload rules
  setBaseDir(newDir: string) {
    this.baseDir = this.normalizePath(newDir);
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

  // Normalize path for cross-platform consistency
  normalizePath(inputPath: string): string {
    const normalized = inputPath.split(path.sep).join(path.posix.sep);
    return normalized.replace(/\/+$/, '');
  }

  // Convert normalized path to platform-specific format
  toPlatformPath(normalizedPath: string): string {
    return normalizedPath.split(path.posix.sep).join(path.sep);
  }

  // Check if a path should be ignored
  ignores(path: string): boolean {
    return this.ig.ignores(path);
  }

  // Load .athignore if it exists, fallback to .gitignore
  async loadIgnoreRules() {
    // Clear existing rules first
    this.clearRules();

    // Always ignore resources directory in main tree
    this.ig.add(`${this.resourcesDir}/`);

    const currentBaseDir = this.getBaseDir();
    const platformBaseDir = this.toPlatformPath(currentBaseDir);

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

  // Add new ignore pattern
  async addIgnorePattern(itemPath: string): Promise<boolean> {
    try {
      // Check if path ends with slash before normalization
      const hadTrailingSlash =
        itemPath.endsWith('/') || itemPath.endsWith('\\');

      // Normalize the path
      const normalizedPath = this.normalizePath(itemPath);

      // Restore the trailing slash if it was present
      const finalPath = hadTrailingSlash
        ? normalizedPath + '/'
        : normalizedPath;

      const ignorePath = this.toPlatformPath(
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

  // Helper function to normalize path for ignore rules
  normalizePathForIgnore(
    filePath: string,
    isDirectory: boolean
  ): string | null {
    if (!filePath) return null;

    try {
      const relativePath = path
        .relative(this.getBaseDir(), filePath)
        .split(path.sep)
        .join('/');

      if (!relativePath || relativePath.startsWith('..')) {
        return null;
      }

      // Append trailing slash for directories
      return isDirectory ? `${relativePath}/` : relativePath;
    } catch (error) {
      console.error('Error normalizing path:', error);
      return null;
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
