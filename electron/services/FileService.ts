// AI Summary: Core file system service coordinating path handling, file operations, watchers,
// and ignore rules with consistent error handling and path normalization.

import * as fs from 'fs/promises';
import { Stats, constants, statSync } from 'fs';
import * as chokidar from 'chokidar';
import { app } from 'electron';
import type { IFileService } from '../../common/types/file-service';
import { PathUtils } from './PathUtils';
import { ignoreRulesManager } from '../ignoreRulesManager';
import { FILE_SYSTEM } from '../../src/utils/constants';

/**
 * FileService provides a centralized API for file system operations in the main process.
 * It handles path normalization, file reading/writing, directory operations,
 * file watching, and integration with ignore rules.
 */
export class FileService implements IFileService {
  private baseDir = PathUtils.normalizeToUnix(process.cwd());
  private watchers = new Map<string, chokidar.FSWatcher>();
  private materialsDir: string;

  constructor() {
    // Set up materials directory path
    this.materialsDir = PathUtils.joinUnix(this.baseDir, FILE_SYSTEM.materialsDirName);
    
    // Initialize ignore rules manager
    ignoreRulesManager.setBaseDir(this.baseDir);
    this.reloadIgnoreRules().catch(err => {
      console.error("Initial ignore rule load failed:", err);
    });
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
   */
  resolve(relativePath: string): string {
    const normalized = this.toUnix(relativePath);
    
    // If already absolute, ensure it's within baseDir
    if (PathUtils.isAbsolute(normalized)) {
      if (!normalized.startsWith(this.baseDir)) {
        throw new Error(`Path traversal attempt detected: ${relativePath}`);
      }
      return normalized;
    }
    
    // Join with baseDir
    const absolutePath = PathUtils.joinUnix(this.baseDir, normalized);
    
    // Final path traversal check
    if (!absolutePath.startsWith(this.baseDir) && absolutePath !== this.baseDir) {
      throw new Error(`Path traversal attempt detected: ${relativePath}`);
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
    
    if (!normalizedAbs.startsWith(this.baseDir)) {
      console.warn(`Attempting to relativize path outside baseDir: ${absolutePath}`);
      return normalizedAbs;
    }
    
    const relativePath = PathUtils.relative(this.baseDir, normalizedAbs);
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
    
    // Clean up existing state
    await this.cleanupWatchers();
    ignoreRulesManager.clearRules();
    
    // Update base directory
    this.baseDir = normalizedDir;
    ignoreRulesManager.setBaseDir(normalizedDir);
    
    // Update materials directory path
    this.materialsDir = PathUtils.joinUnix(this.baseDir, FILE_SYSTEM.materialsDirName);
    
    // Ensure supplementary materials directory exists
    await this.ensureMaterialsDir();
    
    // Reload ignore rules with new base directory
    await this.reloadIgnoreRules();
    
    console.log(`Base directory set to: ${this.baseDir}`);
  }

  /**
   * Get the current base directory (absolute Unix path)
   * @returns Base directory path
   */
  getBaseDir(): string {
    return this.baseDir;
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
   * @param relativePath Project-relative path to the file
   * @param opts Optional read options
   * @returns File contents as string or Buffer
   */
  async read(relativePath: string, opts?: { encoding?: BufferEncoding }): Promise<string | Buffer> {
    try {
      const absPath = this.resolve(relativePath);
      const platformPath = this.toOS(absPath);
      
      // Verify file exists and is readable
      await fs.access(platformPath, constants.R_OK);
      
      // Get file stats to ensure it's a file
      const stats = await fs.stat(platformPath);
      if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${relativePath}`);
      }
      
      return fs.readFile(platformPath, opts);
    } catch (error) {
      console.error(`Error reading file ${relativePath}:`, error);
      throw error;
    }
  }

  /**
   * Write data to a file, creating parent directories if needed
   * @param relativePath Project-relative path to the file
   * @param data Data to write
   */
  async write(relativePath: string, data: string | Buffer): Promise<void> {
    try {
      const absPath = this.resolve(relativePath);
      const absDir = PathUtils.dirname(absPath);
      
      // Ensure parent directory exists
      await this.ensureDir(this.relativize(absDir));
      
      // Normalize line endings for string data
      const normalizedData = typeof data === 'string' ? data.replace(/\r\n/g, '\n') : data;
      
      // Write file
      await fs.writeFile(this.toOS(absPath), normalizedData);
    } catch (error) {
      console.error(`Error writing file ${relativePath}:`, error);
      throw error;
    }
  }

  /**
   * Delete a file
   * @param relativePath Project-relative path to the file
   */
  async remove(relativePath: string): Promise<void> {
    try {
      const absPath = this.resolve(relativePath);
      const platformPath = this.toOS(absPath);
      
      // Verify file exists
      const exists = await this.exists(relativePath);
      if (!exists) {
        throw new Error(`File does not exist: ${relativePath}`);
      }
      
      // Delete file
      await fs.unlink(platformPath);
    } catch (error) {
      console.error(`Error deleting file ${relativePath}:`, error);
      throw error;
    }
  }

  /**
   * Check if a file or directory exists
   * @param relativePath Project-relative path to check
   * @returns True if the path exists
   */
  async exists(relativePath: string): Promise<boolean> {
    try {
      const absPath = this.resolve(relativePath);
      await fs.access(this.toOS(absPath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get stats for a file or directory
   * @param relativePath Project-relative path
   * @returns Stats object or null if path doesn't exist
   */
  async stats(relativePath: string): Promise<Stats | null> {
    try {
      const absPath = this.resolve(relativePath);
      return await fs.stat(this.toOS(absPath));
    } catch {
      return null;
    }
  }

  /**
   * Check if a path is a directory
   * @param relativePath Project-relative path
   * @returns True if the path exists and is a directory
   */
  async isDirectory(relativePath: string): Promise<boolean> {
    const stats = await this.stats(relativePath);
    return stats?.isDirectory() ?? false;
  }

  /**
   * Ensure a directory exists, creating it recursively if needed
   * @param relativePath Project-relative path to directory
   */
  async ensureDir(relativePath: string): Promise<void> {
    try {
      const absPath = this.resolve(relativePath);
      await fs.mkdir(this.toOS(absPath), { recursive: true });
    } catch (error) {
      // Ignore error if directory already exists
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        console.error(`Error creating directory ${relativePath}:`, error);
        throw error;
      }
    }
  }

  /**
   * Read directory contents with optional ignore rules
   * @param relativePath Project-relative path to directory
   * @param opts Options for directory reading
   * @returns Array of filenames (not full paths)
   */
  async readdir(relativePath: string, opts: { applyIgnores?: boolean } = { applyIgnores: true }): Promise<string[]> {
    try {
      const absDir = this.resolve(relativePath);
      const entries = await fs.readdir(this.toOS(absDir));
      
      if (!opts.applyIgnores) {
        return entries;
      }
      
      const filteredEntries: string[] = [];
      
      for (const entry of entries) {
        const entryAbsPath = PathUtils.joinUnix(absDir, entry);
        const entryRelPath = this.relativize(entryAbsPath);
        
        // Materials directory is handled separately, skip it in the main tree
        if (entryRelPath === FILE_SYSTEM.materialsDirName && relativePath === '') {
          continue;
        }
        
        // Check if the entry should be ignored
        const stats = await this.stats(entryRelPath);
        const isDir = stats?.isDirectory() ?? false;
        
        // Normalize path for ignore rules
        const normalizedForIgnore = PathUtils.normalizeForIgnore(entryRelPath, isDir);
        
        if (!normalizedForIgnore || !ignoreRulesManager.ignores(normalizedForIgnore)) {
          filteredEntries.push(entry);
        }
      }
      
      return filteredEntries;
    } catch (error) {
      console.error(`Error reading directory ${relativePath}:`, error);
      throw error;
    }
  }

  // --- Watcher Management ---
  /**
   * Watch a directory for changes
   * @param relativePath Project-relative path to watch
   * @param callback Callback function for file changes
   * @returns Unsubscribe function
   */
  watch(
    relativePath: string,
    callback: (
      event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir',
      projectRelativeFile: string
    ) => void
  ): () => void {
    try {
      const absPath = this.resolve(relativePath);
      const platformPath = this.toOS(absPath);
      const watcherKey = absPath;
      
      // Close existing watcher for the same path if it exists
      if (this.watchers.has(watcherKey)) {
        this.watchers.get(watcherKey)?.close();
        this.watchers.delete(watcherKey);
        console.log(`Closed existing watcher for: ${relativePath}`);
      }
      
      console.log(`Setting up watcher for: ${relativePath}`);
      
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
        console.error(`Watcher error for ${relativePath}:`, error);
      });
      
      // Store watcher
      this.watchers.set(watcherKey, watcher);
      
      // Return unsubscribe function
      return () => {
        if (this.watchers.has(watcherKey)) {
          this.watchers.get(watcherKey)?.close();
          this.watchers.delete(watcherKey);
          console.log(`Closed watcher for: ${relativePath}`);
        }
      };
    } catch (error) {
      console.error(`Error setting up watcher for ${relativePath}:`, error);
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
