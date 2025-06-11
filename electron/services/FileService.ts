// AI Summary: Core file system service coordinating path handling, file operations, watchers,
// and ignore rules with consistent error handling and path normalization. Emits 'base-dir-changed' event.

import * as fs from 'fs/promises';
import { Stats, constants, statSync } from 'fs';
import * as chokidar from 'chokidar';
import { app } from 'electron';
import { EventEmitter } from 'events';
import type { IFileService } from '../../common/types/file-service';
import { PathUtils } from './PathUtils';
import { ignoreRulesManager } from '../ignoreRulesManager';
import { FILE_SYSTEM } from '../../src/utils/constants';

/**
 * FileService provides a centralized API for file system operations in the main process.
 * It handles path normalization, file reading/writing, directory operations,
 * file watching, and integration with ignore rules.
 */
export class FileService extends EventEmitter implements IFileService {
  public cliPath: string | null = null;
  private baseDir: string | null = null;
  private watchers = new Map<string, chokidar.FSWatcher>();
  private materialsDir!: string;

  constructor() {
    super();
    // Defer initialization until setBaseDir is called.
    // The baseDir property will be null until a project is opened.
  }

  // --- Path Helpers ---
  // Delegate to PathUtils for pure functions
  toUnix(p: string): string {
    return PathUtils.normalizeToUnix(p);
  }

  toOS(p: string): string {
    return PathUtils.toPlatform(p);
  }

  join(...parts: string[]): string {
    return PathUtils.joinUnix(...parts);
  }

  dirname(p: string): string {
    return PathUtils.dirname(p);
  }

  basename(p: string): string {
    return PathUtils.basename(p);
  }

  extname(p: string): string {
    return PathUtils.extname(p);
  }

  /**
   * Convert project-relative path to absolute Unix path
   * @param relativePath Project-relative path
   * @returns Absolute Unix-style path
   * @throws Error if the path resolves to a location outside the base directory
   */
  resolve(relativePath: string): string {
    const normalized = this.toUnix(relativePath);
    const baseDir = this.getBaseDir();
    
    // If already absolute, ensure it's within baseDir
    if (PathUtils.isAbsolute(normalized)) {
      if (!normalized.startsWith(baseDir)) {
        throw new Error(`Path traversal attempt detected: ${relativePath}`);
      }
      return normalized;
    }
    
    // Join with baseDir
    const absolutePath = PathUtils.joinUnix(baseDir, normalized);
    
    // Final path traversal check - fixed to correctly handle edge cases
    // The baseDir check should allow paths like "/base/dir" when baseDir is "/base/dir"
    if (!absolutePath.startsWith(baseDir + '/') && absolutePath !== baseDir) {
      // Use PathUtils.isPathInside which correctly handles path equality
      if (!PathUtils.isPathInside(baseDir, absolutePath)) {
        throw new Error(`Path traversal attempt detected: ${relativePath}`);
      }
    }
    
    return absolutePath;
  }

  /**
   * Handles absolute paths directly or converts relative paths using resolve
   * @param pathStr Path string (absolute or relative)
   * @param mustExist Whether to verify the path exists
   * @returns Normalized absolute Unix path
   * @throws Error if the path is relative and resolves outside the base directory,
   *         or if mustExist is true and the path doesn't exist
   */
  private toAbsolute(pathStr: string, mustExist = false): string {
    // Normalize to Unix style
    const normalized = this.toUnix(pathStr);
    
    // Handle absolute vs relative paths
    const absolutePath = PathUtils.isAbsolute(normalized)
      ? normalized // Already absolute, use as-is
      : this.resolve(normalized); // Relative, resolve (with traversal checks)
    
    // Optionally verify existence
    if (mustExist) {
      try {
        const platformPath = this.toOS(absolutePath);
        statSync(platformPath);
      } catch (error) {
        throw new Error(`Path does not exist: ${pathStr}`);
      }
    }
    
    return absolutePath;
  }

  /**
   * Convert absolute Unix path to project-relative Unix path
   * @param absolutePath Absolute Unix path
   * @returns Project-relative Unix path
   */
  relativize(absolutePath: string): string {
    const normalizedAbs = this.toUnix(absolutePath);
    const baseDir = this.getBaseDir();
    
    if (!normalizedAbs.startsWith(baseDir)) {
      console.warn(`Attempting to relativize path outside baseDir: ${absolutePath}`);
      return normalizedAbs;
    }
    
    const relativePath = PathUtils.relative(baseDir, normalizedAbs);
    return relativePath === '' ? '.' : relativePath;
  }

  // --- Base Directory Management ---
  /**
   * Set the base directory for project files
   * @param absoluteDir New base directory (absolute path)
   */
  async setBaseDir(absoluteDir: string): Promise<void> {
    const normalizedDir = this.toUnix(absoluteDir);
    
    if (normalizedDir === this.baseDir) {
      return; // No change needed
    }
    
    // If we're changing from an existing project, clean up
    if (this.baseDir !== null) {
      await this.cleanupWatchers();
      ignoreRulesManager.clearRules();
    }
    
    // Update base directory
    this.baseDir = normalizedDir;
    
    // Perform initial setup or update
    await ignoreRulesManager.setBaseDir(this.baseDir);
    this.materialsDir = PathUtils.joinUnix(this.baseDir, FILE_SYSTEM.materialsDirName);
    await this.ensureMaterialsDir();
    
    console.log(`Base directory set to: ${this.baseDir}`);
    
    // Emit event for other services to hook into
    this.emit('base-dir-changed');
  }

  /**
   * Get the current base directory (absolute Unix path)
   * @returns Base directory path
   */
  getBaseDir(): string {
    // The baseDir is now nullable, but many parts of the app expect a string.
    // This method should only be called after a project is opened.
    // We return a fallback to prevent crashes, but this indicates a logic issue if null.
    return this.baseDir ?? PathUtils.normalizeToUnix(process.cwd());
  }

  /**
   * Get the supplementary materials directory path
   * @returns Materials directory path
   */
  getMaterialsDir(): string {
    return this.materialsDir;
  }

  /**
   * Ensure supplementary materials directory exists
   */
  private async ensureMaterialsDir(): Promise<void> {
    try {
      await this.ensureDir(FILE_SYSTEM.materialsDirName);
      console.log('Supplementary materials directory ready');
    } catch (error) {
      console.error('Failed to ensure materials directory:', error);
      throw error;
    }
  }

  // --- Core FS Operations ---
  /**
   * Read a file's contents
   * @param pathStr Path to the file (absolute or project-relative)
   * @param opts Optional read options
   * @returns File contents as string or Buffer
   */
  async read(pathStr: string, opts?: { encoding?: BufferEncoding }): Promise<string | Buffer> {
    try {
      const absPath = this.toAbsolute(pathStr);
      const platformPath = this.toOS(absPath);
      
      // Verify file exists and is readable
      await fs.access(platformPath, constants.R_OK);
      
      // Get file stats to ensure it's a file
      const stats = await fs.stat(platformPath);
      if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${pathStr}`);
      }
      
      return fs.readFile(platformPath, opts);
    } catch (error) {
      console.error(`Error reading file ${pathStr}:`, error);
      throw error;
    }
  }

  /**
   * Write data to a file, creating parent directories if needed
   * @param pathStr Path to the file (absolute or project-relative)
   * @param data Data to write
   */
  async write(pathStr: string, data: string | Buffer): Promise<void> {
    try {
      const absPath = this.toAbsolute(pathStr);
      const absDir = PathUtils.dirname(absPath);
      
      // Ensure parent directory exists
      if (PathUtils.isPathInside(this.getBaseDir(), absPath)) {
        // For paths inside the project, use ensureDir with relative path
        await this.ensureDir(this.relativize(absDir));
      } else {
        // For external paths, use mkdir directly
        await fs.mkdir(this.toOS(absDir), { recursive: true });
      }
      
      // Normalize line endings for string data
      const normalizedData = typeof data === 'string' ? data.replace(/\r\n/g, '\n') : data;
      
      // Write file
      await fs.writeFile(this.toOS(absPath), normalizedData);
    } catch (error) {
      console.error(`Error writing file ${pathStr}:`, error);
      throw error;
    }
  }

  /**
   * Delete a file
   * @param pathStr Path to the file (absolute or project-relative)
   */
  async remove(pathStr: string): Promise<void> {
    try {
      const absPath = this.toAbsolute(pathStr);
      const platformPath = this.toOS(absPath);
      
      // Verify file exists
      try {
        await fs.access(platformPath);
      } catch {
        throw new Error(`File does not exist: ${pathStr}`);
      }
      
      // Delete file
      await fs.unlink(platformPath);
    } catch (error) {
      console.error(`Error deleting file ${pathStr}:`, error);
      throw error;
    }
  }

  /**
   * Check if a file or directory exists
   * @param pathStr Path to check (absolute or project-relative)
   * @returns True if the path exists
   */
  async exists(pathStr: string): Promise<boolean> {
    try {
      const absPath = this.toAbsolute(pathStr);
      await fs.access(this.toOS(absPath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get stats for a file or directory
   * @param pathStr Path (absolute or project-relative)
   * @returns Stats object or null if path doesn't exist
   */
  async stats(pathStr: string): Promise<Stats | null> {
    try {
      const absPath = this.toAbsolute(pathStr);
      return await fs.stat(this.toOS(absPath));
    } catch {
      return null;
    }
  }

  /**
   * Check if a path is a directory
   * @param pathStr Path (absolute or project-relative)
   * @returns True if the path exists and is a directory
   */
  async isDirectory(pathStr: string): Promise<boolean> {
    const stats = await this.stats(pathStr);
    return stats?.isDirectory() ?? false;
  }

  /**
   * Ensure a directory exists, creating it recursively if needed
   * @param pathStr Path to directory (absolute or project-relative)
   */
  async ensureDir(pathStr: string): Promise<void> {
    try {
      const absPath = this.toAbsolute(pathStr);
      await fs.mkdir(this.toOS(absPath), { recursive: true });
    } catch (error) {
      // Ignore error if directory already exists
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        console.error(`Error creating directory ${pathStr}:`, error);
        throw error;
      }
    }
  }

  /**
   * Read directory contents with optional ignore rules
   * @param pathStr Path to directory (absolute or project-relative)
   * @param opts Options for directory reading
   * @returns Array of filenames (not full paths)
   */
  async readdir(pathStr: string, opts: { applyIgnores?: boolean } = { applyIgnores: true }): Promise<string[]> {
    try {
      const absDir = this.toAbsolute(pathStr);
      const entries = await fs.readdir(this.toOS(absDir));
      const baseDir = this.getBaseDir();
      
      if (!opts.applyIgnores) {
        return entries;
      }
      
      const filteredEntries: string[] = [];
      
      // Skip ignore rule processing for paths outside the project base directory
      const isExternalPath = !PathUtils.isPathInside(baseDir, absDir);
      
      for (const entry of entries) {
        const entryAbsPath = PathUtils.joinUnix(absDir, entry);
        
        if (isExternalPath) {
          // For external paths, don't apply ignore rules
          filteredEntries.push(entry);
          continue;
        }
        
        const entryRelPath = this.relativize(entryAbsPath);
        
        // Materials directory is handled separately, skip it in the main tree
        if (entryRelPath === FILE_SYSTEM.materialsDirName && 
            (pathStr === '' || pathStr === '.' || pathStr === baseDir)) {
          continue;
        }
        
        // Check if the entry should be ignored
        let stats: Stats | null;
        try {
          stats = await fs.stat(this.toOS(entryAbsPath));
        } catch {
          stats = null;
        }
        
        const isDir = stats?.isDirectory() ?? false;
        
        // Normalize path for ignore rules
        const normalizedForIgnore = PathUtils.normalizeForIgnore(entryRelPath, isDir);
        
        if (!normalizedForIgnore || !ignoreRulesManager.ignores(normalizedForIgnore)) {
          filteredEntries.push(entry);
        }
      }
      
      return filteredEntries;
    } catch (error) {
      console.error(`Error reading directory ${pathStr}:`, error);
      throw error;
    }
  }

  /**
   * Get all file paths in the project, respecting ignore rules.
   * @returns A promise that resolves to an array of project-relative file paths.
   */
  async getAllFilePaths(): Promise<string[]> {
    return this._getAllFilePathsRecursive(this.getBaseDir());
  }

  /**
   * Recursively scans a directory to get all file paths.
   * @param absoluteDir The absolute directory path to scan.
   * @returns A promise that resolves to an array of project-relative file paths.
   */
  private async _getAllFilePathsRecursive(
    absoluteDir: string
  ): Promise<string[]> {
    let allFiles: string[] = [];
    try {
      const entries = await this.readdir(absoluteDir, { applyIgnores: true });

      for (const entry of entries) {
        const entryAbsPath = this.join(absoluteDir, entry);
        try {
          const stats = await this.stats(entryAbsPath);
          if (stats?.isDirectory()) {
            const subFiles = await this._getAllFilePathsRecursive(entryAbsPath);
            allFiles.push(...subFiles);
          } else if (stats?.isFile()) {
            allFiles.push(this.relativize(entryAbsPath));
          }
        } catch (statError) {
          // Ignore errors for files that might be deleted during the scan (e.g., temp files)
          console.warn(`Could not stat path ${entryAbsPath}:`, statError);
        }
      }
    } catch (readError) {
      console.warn(`Could not read directory ${absoluteDir}:`, readError);
    }
    return allFiles;
  }

  // --- Watcher Management ---
  /**
   * Watch a directory for changes
   * @param pathStr Path to watch (absolute or project-relative)
   * @param callback Callback function for file changes
   * @returns Unsubscribe function
   */
  watch(
    pathStr: string,
    callback: (
      event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir',
      projectRelativeFile: string
    ) => void
  ): () => void {
    try {
      const absPath = this.toAbsolute(pathStr);
      const platformPath = this.toOS(absPath);
      const watcherKey = absPath;
      
      // Close existing watcher for the same path if it exists
      if (this.watchers.has(watcherKey)) {
        this.watchers.get(watcherKey)?.close();
        this.watchers.delete(watcherKey);
        console.log(`Closed existing watcher for: ${pathStr}`);
      }
      
      console.log(`Setting up watcher for: ${pathStr}`);
      
      // Create new watcher
      const watcher = chokidar.watch(platformPath, {
        ignored: (filePath: string) => {
          if (!filePath) return true;
          
          try {
            // Get file stats to determine if it's a directory
            const stats = statSync(filePath);
            const absUnixPath = this.toUnix(filePath);
            const relPath = this.relativize(absUnixPath);
            
            // Skip paths outside the project
            if (relPath === '' || relPath.startsWith('..')) {
              return true;
            }
            
            // Normalize path for ignore rules
            const normalizedForIgnore = PathUtils.normalizeForIgnore(
              relPath,
              stats.isDirectory()
            );
            
            // Check if path should be ignored
            return normalizedForIgnore ? ignoreRulesManager.ignores(normalizedForIgnore) : true;
          } catch (error) {
            // If stats fails (e.g., file doesn't exist), ignore the path
            return true;
          }
        },
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 500,
          pollInterval: 100,
        },
      });
      
      // Set up event handlers
      watcher.on('all', (event, filePath) => {
        const absUnixPath = this.toUnix(filePath);
        const relPath = this.relativize(absUnixPath);
        
        // Skip if path is outside the project
        if (relPath === '' || relPath.startsWith('..')) {
          return;
        }
        
        // Only forward valid events
        if (event === 'add' || event === 'change' || event === 'unlink' || 
            event === 'addDir' || event === 'unlinkDir') {
          callback(event, relPath);
        }
      });
      
      // Handle errors
      watcher.on('error', (error) => {
        console.error(`Watcher error for ${pathStr}:`, error);
      });
      
      // Store watcher
      this.watchers.set(watcherKey, watcher);
      
      // Return unsubscribe function
      return () => {
        if (this.watchers.has(watcherKey)) {
          this.watchers.get(watcherKey)?.close();
          this.watchers.delete(watcherKey);
          console.log(`Closed watcher for: ${pathStr}`);
        }
      };
    } catch (error) {
      console.error(`Error setting up watcher for ${pathStr}:`, error);
      throw error;
    }
  }

  // --- Ignore Rules Integration ---
  /**
   * Reload ignore rules
   */
  async reloadIgnoreRules(): Promise<void> {
    try {
      await ignoreRulesManager.loadIgnoreRules();
    } catch (error) {
      console.error('Error reloading ignore rules:', error);
      throw error;
    }
  }

  /**
   * Check if a path is ignored
   * @param projectRelativePath Project-relative path
   * @returns True if the path is ignored
   */
  isIgnored(projectRelativePath: string): boolean {
    try {
      // Determine if it's a directory (path ending with '/' is a convention)
      const isDir = projectRelativePath.endsWith('/');
      
      // Normalize path for ignore rules
      const normalizedForIgnore = PathUtils.normalizeForIgnore(
        projectRelativePath,
        isDir
      );
      
      return normalizedForIgnore ? ignoreRulesManager.ignores(normalizedForIgnore) : false;
    } catch (error) {
      console.error(`Error checking if path is ignored: ${projectRelativePath}`, error);
      return false;
    }
  }

  /**
   * Add a path to the ignore rules
   * @param itemPath Path to ignore
   * @param ignoreAll Whether to ignore all items with this name
   * @returns True if the path was added
   */
  async addToIgnore(itemPath: string, ignoreAll = false): Promise<boolean> {
    try {
      return await ignoreRulesManager.addIgnorePattern(itemPath, ignoreAll);
    } catch (error) {
      console.error(`Error adding path to ignore: ${itemPath}`, error);
      throw error;
    }
  }

  // --- Application/Resource Path Helpers ---
  /**
   * Get the application directory path
   * @returns Absolute path to the application directory
   */
  getAppPath(): string {
    return this.toUnix(app.getAppPath());
  }

  /**
   * Get the resources directory path
   * @returns Absolute path to the resources directory
   */
  async getResourcesPath(): Promise<string> {
    let resourcesPath: string;
    
    if (app.isPackaged) {
      // In production, use process.resourcesPath
      resourcesPath = this.toUnix(process.resourcesPath);
    } else {
      // In development, join 'resources' to app path
      const appPath = this.getAppPath();
      resourcesPath = PathUtils.joinUnix(appPath, 'resources');
    }
    
    return resourcesPath;
  }

  /**
   * Get the path to a prompt template
   * @param templateName Name of the template
   * @returns Absolute path to the template
   */
  async getPromptTemplatePath(templateName: string): Promise<string> {
    const resourcesPath = await this.getResourcesPath();
    return PathUtils.joinUnix(resourcesPath, 'prompts', templateName);
  }

  // --- Cleanup ---
  /**
   * Close all active file watchers
   */
  async cleanupWatchers(): Promise<void> {
    console.log(`Cleaning up ${this.watchers.size} watchers...`);
    
    for (const [key, watcher] of this.watchers.entries()) {
      await watcher.close();
      console.log(`Closed watcher for key: ${key}`);
    }
    
    this.watchers.clear();
    console.log("All watchers cleared.");
  }
}
