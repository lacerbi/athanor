// AI Summary: Manages file system operations, ignore rules, and file watchers with cross-platform path handling.
// Handles .athignore and .gitignore file loading, path normalization, and watcher lifecycle.
// Provides utility functions for directory existence checking, stats retrieval, and path validation.
import * as path from 'path';
import * as fs from 'fs/promises';
import { Stats, constants } from 'fs';
import * as chokidar from 'chokidar';
import ignore from 'ignore';
import { FILE_SYSTEM } from '../src/utils/constants';

// Constants for resource directory management
const resourcesDir = FILE_SYSTEM.resourcesDirName;

// Initialize ignore instance
export let ig = ignore();
let baseDir = process.cwd();

// Track last error for recovery
let lastError: Error | null = null;

// Get external resources directory path
export function getResourcesDir(): string {
  return path.join(getBaseDir(), resourcesDir);
}

// Ensure extrenal resources directory exists
export async function ensureResourcesDir(): Promise<void> {
  const resourcesPath = toPlatformPath(getResourcesDir());
  try {
    await fs.access(resourcesPath, constants.F_OK);
  } catch {
    await fs.mkdir(resourcesPath, { recursive: true });
    console.log('Created resources directory:', resourcesPath);
  }
}

// Clear all file system state
export function clearFileSystemState() {
  // Clear ignore rules
  ig = ignore();
  console.log('Ignore rules cleared.');

  // Clear active watchers
  cleanupWatchers();

  // Reset error state
  lastError = null;
}

// Export function to update base directory
export function setBaseDir(newDir: string) {
  baseDir = normalizePath(newDir);
  // Clear existing state first
  clearFileSystemState();
  // Load new ignore rules for the directory
  loadIgnoreRules().catch((error) => {
    console.error('Error reloading ignore rules:', error);
  });
}

export function getBaseDir() {
  return baseDir;
}

// Normalize path for cross-platform consistency
export function normalizePath(inputPath: string): string {
  // Convert to posix style for internal handling
  const normalized = inputPath.split(path.sep).join(path.posix.sep);
  // Remove any trailing slashes
  return normalized.replace(/\/+$/, '');
}

// Convert normalized path back to platform-specific format
export function toPlatformPath(normalizedPath: string): string {
  return normalizedPath.split(path.posix.sep).join(path.sep);
}

// Store active file watchers
export const activeWatchers = new Map<string, chokidar.FSWatcher>();

// Load .athignore if it exists, fallback to .gitignore and add .git
export async function loadIgnoreRules() {
  // Clear existing rules first
  ig = ignore();

  // Always ignore resources directory in main tree
  ig.add(`${resourcesDir}/`);

  const currentBaseDir = getBaseDir();
  const platformBaseDir = toPlatformPath(currentBaseDir);

  // Try .athignore first
  const athignorePath = path.join(platformBaseDir, '.athignore');
  try {
    const data = await fs.readFile(athignorePath, 'utf-8');
    ig.add(data);
    console.log('.athignore rules loaded from:', athignorePath);
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Error reading .athignore:', error);
      return;
    }
    // .athignore not found, try .gitignore
    const gitignorePath = path.join(platformBaseDir, '.gitignore');
    try {
      const data = await fs.readFile(gitignorePath, 'utf-8');
      ig.add(data);
      // Always add .git directory when using .gitignore
      ig.add('.git/');
      console.log(
        '.gitignore rules loaded with .git directory excluded from:',
        gitignorePath
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('No ignore files found. No ignore rules applied.');
      } else {
        console.error('Error reading .gitignore:', error);
      }
    }
  }
}

// Enhanced error handling with state tracking
export function handleError(error: unknown, operation: string): never {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  lastError = errorObj;
  console.error(`Error during ${operation}:`, error);
  throw errorObj;
}

// Get last error if any
export function getLastError(): Error | null {
  return lastError;
}

// Clear error state
export function clearError(): void {
  lastError = null;
}

// Helper function to safely check if path exists
export async function pathExists(pathStr: string): Promise<boolean> {
  try {
    await fs.access(pathStr);
    return true;
  } catch {
    return false;
  }
}

// Helper function to get file stats safely
export async function getStats(pathStr: string): Promise<Stats | null> {
  try {
    return await fs.stat(pathStr);
  } catch {
    return null;
  }
}

// Helper function to ensure a directory exists
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // If directory already exists, that's fine
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

// Clean up file watchers
export function cleanupWatchers() {
  for (const watcher of activeWatchers.values()) {
    watcher.close();
  }
  activeWatchers.clear();
}

// Helper function to normalize path for ignore rules
export function normalizePathForIgnore(
  filePath: string,
  isDirectory: boolean
): string | null {
  if (!filePath) return null;

  try {
    const relativePath = path
      .relative(getBaseDir(), filePath)
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
