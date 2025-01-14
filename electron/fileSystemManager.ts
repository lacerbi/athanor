// AI Summary: Manages file system operations with path normalization and watcher lifecycle.
// Delegates ignore rule management to ignoreRulesManager and provides clean interface
// for file system operations.
import * as path from 'path';
import * as fs from 'fs/promises';
import { Stats, constants } from 'fs';
import * as chokidar from 'chokidar';
import { FILE_SYSTEM } from '../src/utils/constants';
import { ignoreRulesManager } from './ignoreRulesManager';

// Constants for resource directory management
const resourcesDir = FILE_SYSTEM.resourcesDirName;

let baseDir = process.cwd();

// Get external resources directory path
export function getResourcesDir(): string {
  return path.join(getBaseDir(), resourcesDir);
}

// Ensure external resources directory exists
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
  // Clear active watchers
  cleanupWatchers();

  // Clear ignore rules
  ignoreRulesManager.clearRules();
}

// Export function to update base directory
export function setBaseDir(newDir: string) {
  baseDir = ignoreRulesManager.normalizePath(newDir);
  clearFileSystemState();
  ignoreRulesManager.setBaseDir(newDir);
}

export function getBaseDir() {
  return baseDir;
}

// Store active file watchers
export const activeWatchers = new Map<string, chokidar.FSWatcher>();

// Load ignore rules
export async function loadIgnoreRules() {
  return ignoreRulesManager.loadIgnoreRules();
}

// Enhanced error handling
export function handleError(error: unknown, operation: string): never {
  console.error(`Error during ${operation}:`, error);
  throw error instanceof Error ? error : new Error(String(error));
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

// Export functions from ignoreRulesManager
export const normalizePath = ignoreRulesManager.normalizePath.bind(ignoreRulesManager);
export const toPlatformPath = ignoreRulesManager.toPlatformPath.bind(ignoreRulesManager);
export const normalizePathForIgnore = ignoreRulesManager.normalizePathForIgnore.bind(ignoreRulesManager);
