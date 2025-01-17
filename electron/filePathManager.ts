// AI Summary: Centralizes path handling with Unix-style normalization internally and platform-specific 
// conversion when needed. Manages base directory vs. app directory paths and provides core path 
// manipulation utilities. All path-related operations should go through this manager.

import * as path from 'path';
import { app } from 'electron';
import { FILE_SYSTEM } from '../src/utils/constants';

// Singleton class to manage all file path operations consistently across the application
class FilePathManager {
  private baseDir: string = process.cwd();
  private appDir: string = '';

  constructor() {
    this.appDir = app.getAppPath();
  }

  // Set the base directory for user files
  setBaseDir(newDir: string): void {
    this.baseDir = this.normalizeToUnix(newDir);
  }

  // Get the current base directory (user's working directory)
  getBaseDir(): string {
    return this.baseDir;
  }

  // Get Athanor's application directory
  getAppDir(): string {
    return this.appDir;
  }

  // Get the resources directory path relative to base directory
  getResourcesDir(): string {
    return this.joinUnixPaths(this.getBaseDir(), FILE_SYSTEM.resourcesDirName);
  }

  // Normalize any path to Unix-style format for internal use
  // Removes trailing slashes and normalizes path separators
  normalizeToUnix(inputPath: string): string {
    if (!inputPath) return '';
    // Convert Windows backslashes to forward slashes
    const normalized = inputPath.split(path.sep).join(path.posix.sep);
    // Remove trailing slashes unless it's the root path
    return normalized === '/' ? normalized : normalized.replace(/\/+$/, '');
  }

  // Convert a normalized Unix-style path to the current platform's format
  toPlatformPath(unixPath: string): string {
    return unixPath.split(path.posix.sep).join(path.sep);
  }

  // Join path segments using Unix-style separators
  joinUnixPaths(...paths: string[]): string {
    return this.normalizeToUnix(path.join(...paths));
  }

  // Resolve Unix-style paths
  resolveUnixPath(...paths: string[]): string {
    return this.normalizeToUnix(path.resolve(...paths));
  }

  // Get relative path from base directory
  relativeToCwd(absolutePath: string): string {
    return this.normalizeToUnix(path.relative(this.getBaseDir(), absolutePath));
  }

  // Check if path is absolute
  isAbsolutePath(pathStr: string): boolean {
    return path.isAbsolute(pathStr);
  }

  // Convert relative path to absolute path from base directory
  resolveFromBase(relativePath: string): string {
    if (this.isAbsolutePath(relativePath)) {
      return this.normalizeToUnix(relativePath);
    }
    return this.joinUnixPaths(this.getBaseDir(), relativePath);
  }

  // Normalize a path for ignore rules (append trailing slash for directories)
  normalizeForIgnore(filePath: string, isDirectory: boolean): string | null {
    if (!filePath) return null;

    try {
      const relativePath = this.relativeToCwd(filePath);
      if (!relativePath || relativePath.startsWith('..')) {
        return null;
      }

      return isDirectory ? `${relativePath}/` : relativePath;
    } catch (error) {
      console.error('Error normalizing path for ignore:', error);
      return null;
    }
  }

  // Get parent directory path
  getParentDir(pathStr: string): string {
    return this.normalizeToUnix(path.dirname(pathStr));
  }

  // Get file/directory name from path
  getBaseName(pathStr: string): string {
    return path.basename(pathStr);
  }

  // Get file extension
  getExtension(pathStr: string): string {
    return path.extname(pathStr);
  }
}

// Export singleton instance
export const filePathManager = new FilePathManager();
