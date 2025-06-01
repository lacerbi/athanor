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
    // Convert Windows backslashes to forward slashes reliably
    const normalized = inputPath.replace(/\\/g, '/');
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
    // Only convert slashes on Windows, leave untouched on other platforms
    return process.platform === 'win32' 
      ? unixPath.split(path.posix.sep).join(path.win32.sep)
      : unixPath;
  }

  /**
   * Join path segments using Unix-style separators
   * @param paths Path segments to join
   * @returns Joined path with forward slashes
   */
  static joinUnix(...paths: string[]): string {
    // Normalize each segment to Unix-style, handling null/undefined
    const processedSegments = paths.map(p => p ? PathUtils.normalizeToUnix(p) : '');
    
    // Join using POSIX rules
    let joined = path.posix.join(...processedSegments);

    // Preserve original behavior: if all original inputs were empty, return empty string
    if (joined === '.' && paths.every(p => !p)) {
      return '';
    }
    
    // Final normalization for consistency
    return PathUtils.normalizeToUnix(joined);
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
    const unixPath = PathUtils.normalizeToUnix(pathStr);
    const dir = path.posix.dirname(unixPath);

    // Match test behavior: dirname of simple "file.txt" is "", dirname of "./file.txt" is "."
    if (dir === '.') {
      // If unixPath didn't contain '/', it was a simple filename
      return unixPath.includes('/') ? '.' : '';
    }
    return dir;
  }

  /**
   * Get the base name (filename or directory name) from a path
   * @param pathStr Path to extract name from
   * @returns Base name (without parent directories)
   */
  static basename(pathStr: string): string {
    if (!pathStr) return '';
    const unixPath = PathUtils.normalizeToUnix(pathStr);
    return path.posix.basename(unixPath);
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
    // Handle empty inputs as per existing test expectations
    if (!from && to) return PathUtils.normalizeToUnix(to);
    if (!to) return '';
    if (!from) return '';

    const normalizedFrom = PathUtils.normalizeToUnix(from);
    const normalizedTo = PathUtils.normalizeToUnix(to);
    
    // Use path.posix.relative for consistent Unix-style relative paths
    const relativePath = path.posix.relative(normalizedFrom, normalizedTo);
    
    // Normalize the result to ensure consistency
    return PathUtils.normalizeToUnix(relativePath);
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
      let normalizedPath = PathUtils.normalizeToUnix(filePath);
      
      // If baseDir provided, handle path resolution
      if (baseDir) {
        const normalizedBaseDir = PathUtils.normalizeToUnix(baseDir);
        
        // If the path is relative, resolve it relative to baseDir, not cwd
        if (!PathUtils.isAbsolute(normalizedPath)) {
          normalizedPath = PathUtils.joinUnix(normalizedBaseDir, normalizedPath);
        }
        
        // Make the path relative to baseDir
        const relativePath = PathUtils.relative(normalizedBaseDir, normalizedPath);
        if (!relativePath || relativePath.startsWith('..')) {
          return null; // Path is outside the base directory
        }
        
        // Add trailing slash for directories if not present
        if (isDirectory && !relativePath.endsWith('/')) {
          return `${relativePath}/`;
        }
        
        return relativePath;
      }

      // No baseDir provided, just normalize and add trailing slash if needed
      if (isDirectory && !normalizedPath.endsWith('/')) {
        return `${normalizedPath}/`;
      }
      
      return normalizedPath;
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
   * @returns True if child is inside parent or is the same path
   */
  static isPathInside(parent: string, child: string): boolean {
    if (!parent || !child) return false;
    
    // Normalize both paths and remove trailing slashes
    const normalizedParent = PathUtils.removeTrailingSlash(
      PathUtils.normalizeToUnix(parent)
    );
    const normalizedChild = PathUtils.removeTrailingSlash(
      PathUtils.normalizeToUnix(child)
    );
    
    // Check if paths are the same
    if (normalizedParent === normalizedChild) return true;
    
    // Check if child is inside parent (starts with parent + '/')
    return normalizedChild.startsWith(normalizedParent + '/');
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
