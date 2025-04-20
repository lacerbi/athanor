// AI Summary: Stateless path utilities providing consistent path manipulation across platforms
// with Unix-style normalization internally and platform-specific conversion when needed.

import * as path from 'path';

/**
 * PathUtils provides pure, stateless path manipulation functions.
 * These functions don't depend on any runtime state or file system access.
 * Because they are pure, they can be used both in the main and renderer processes.
 */
export class PathUtils {
  // Platform-specific path separator for external conversions
  static readonly sep = path.sep;

  /**
   * Normalize any path to Unix-style format (forward slashes)
   * @param inputPath Path to normalize
   * @returns Normalized path with forward slashes
   */
  static normalizeToUnix(inputPath: string): string {
    if (!inputPath) return '';
    // Convert Windows backslashes to forward slashes
    const normalized = inputPath.split(path.sep).join(path.posix.sep);
    // Remove trailing slashes unless it's the root path
    return normalized === '/' ? normalized : normalized.replace(/\/+$/, '');
  }

  /**
   * Convert a Unix-style path to the current platform's format
   * @param unixPath Unix-style path with forward slashes
   * @returns Platform-specific path (with backslashes on Windows)
   */
  static toPlatform(unixPath: string): string {
    if (!unixPath) return '';
    return unixPath.split(path.posix.sep).join(path.sep);
  }

  /**
   * Join path segments using Unix-style separators
   * @param paths Path segments to join
   * @returns Joined path with forward slashes
   */
  static joinUnix(...paths: string[]): string {
    return PathUtils.normalizeToUnix(path.join(...paths));
  }

  /**
   * Join path segments using platform-specific separators
   * @param paths Path segments to join
   * @returns Joined path with platform-specific separators
   */
  static joinPlatform(...paths: string[]): string {
    return path.join(...paths);
  }

  /**
   * Resolve a path or sequence of paths to an absolute path using Unix separators
   * @param paths Paths to resolve
   * @returns Absolute path with forward slashes
   */
  static resolveUnix(...paths: string[]): string {
    return PathUtils.normalizeToUnix(path.resolve(...paths));
  }

  /**
   * Resolve a path or sequence of paths to an absolute path using platform separators
   * @param paths Paths to resolve
   * @returns Absolute path with platform-specific separators
   */
  static resolvePlatform(...paths: string[]): string {
    return path.resolve(...paths);
  }

  /**
   * Check if a path is absolute
   * @param pathStr Path to check
   * @returns True if the path is absolute
   */
  static isAbsolute(pathStr: string): boolean {
    return path.isAbsolute(pathStr);
  }

  /**
   * Get the parent directory of a path
   * @param pathStr Path to get parent for
   * @returns Parent directory path with forward slashes
   */
  static dirname(pathStr: string): string {
    if (!pathStr) return '';
    return PathUtils.normalizeToUnix(path.dirname(pathStr));
  }

  /**
   * Get the base name (filename or directory name) from a path
   * @param pathStr Path to extract name from
   * @returns Base name (without parent directories)
   */
  static basename(pathStr: string): string {
    if (!pathStr) return '';
    return path.basename(pathStr);
  }

  /**
   * Get the file extension from a path
   * @param pathStr Path to extract extension from
   * @returns File extension (with leading dot)
   */
  static extname(pathStr: string): string {
    if (!pathStr) return '';
    return path.extname(pathStr);
  }

  /**
   * Get relative path from one path to another
   * @param from Source path
   * @param to Target path
   * @returns Relative path with forward slashes
   */
  static relative(from: string, to: string): string {
    if (!from || !to) return to || '';
    
    // Normalize both paths to Unix format for consistent handling
    const normalizedFrom = PathUtils.normalizeToUnix(from);
    const normalizedTo = PathUtils.normalizeToUnix(to);
    
    // Calculate relative path and normalize to Unix format
    return PathUtils.normalizeToUnix(path.relative(normalizedFrom, normalizedTo));
  }

  /**
   * Normalize a path for ignore rules
   * Adds trailing slash for directories and ensures relative format
   * @param filePath Path to normalize
   * @param isDirectory Whether the path represents a directory
   * @returns Normalized path for ignore rules or null if invalid
   */
  static normalizeForIgnore(filePath: string, isDirectory: boolean, baseDir?: string): string | null {
    if (!filePath) return null;

    try {
      // Convert to Unix format
      const normalizedPath = PathUtils.normalizeToUnix(filePath);
      
      // If baseDir provided, make the path relative
      let relativePath = normalizedPath;
      if (baseDir) {
        relativePath = PathUtils.relative(baseDir, normalizedPath);
        if (!relativePath || relativePath.startsWith('..')) {
          return null; // Path is outside the base directory
        }
      }

      // Add trailing slash for directories if not present
      if (isDirectory && !relativePath.endsWith('/')) {
        return `${relativePath}/`;
      }
      
      return relativePath;
    } catch (error) {
      console.error('Error normalizing path for ignore:', error);
      return null;
    }
  }

  /**
   * Ensures a path has a trailing slash
   * @param pathStr Path to ensure trailing slash
   * @returns Path with trailing slash
   */
  static ensureTrailingSlash(pathStr: string): string {
    if (!pathStr) return '/';
    const normalized = PathUtils.normalizeToUnix(pathStr);
    return normalized.endsWith('/') ? normalized : `${normalized}/`;
  }

  /**
   * Ensures a path does not have a trailing slash
   * @param pathStr Path to remove trailing slash from
   * @returns Path without trailing slash
   */
  static removeTrailingSlash(pathStr: string): string {
    if (!pathStr) return '';
    const normalized = PathUtils.normalizeToUnix(pathStr);
    return normalized === '/' ? normalized : normalized.replace(/\/+$/, '');
  }

  /**
   * Parse a path into its component parts
   * @param pathStr Path to parse
   * @returns Object with root, dir, base, ext, and name properties
   */
  static parse(pathStr: string): path.ParsedPath {
    if (!pathStr) return { root: '', dir: '', base: '', ext: '', name: '' };
    return path.parse(pathStr);
  }

  /**
   * Check if a path is inside another path
   * @param parent Parent path to check against
   * @param child Child path to check
   * @returns True if child is inside parent
   */
  static isPathInside(parent: string, child: string): boolean {
    if (!parent || !child) return false;
    
    // Normalize both paths
    const normalizedParent = PathUtils.ensureTrailingSlash(
      PathUtils.normalizeToUnix(parent)
    );
    const normalizedChild = PathUtils.normalizeToUnix(child);
    
    // Check if child starts with parent
    return normalizedChild.startsWith(normalizedParent);
  }

  /**
   * Get the appropriate temporary directory path
   * @returns Platform-specific temporary directory
   */
  static getTempPath(): string {
    return PathUtils.normalizeToUnix(require('os').tmpdir());
  }

  /**
   * Sanitize a filename by removing invalid characters
   * @param filename Filename to sanitize
   * @returns Sanitized filename
   */
  static sanitizeFilename(filename: string): string {
    if (!filename) return '';
    // Replace characters invalid in filenames across platforms
    return filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  }
}
