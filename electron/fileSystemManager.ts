// AI Summary: Manages file system operations with path normalization and watcher lifecycle.
// Delegates path handling to filePathManager and provides clean interface for file system operations.
// Integrates with ignoreRulesManager for rule application.
import * as fs from 'fs/promises';
import { Stats, constants } from 'fs';
import * as chokidar from 'chokidar';
import { FILE_SYSTEM } from '../src/utils/constants';
import { ignoreRulesManager } from './ignoreRulesManager';
import { filePathManager } from './filePathManager';

// Get supplementary materials directory path
export function getMaterialsDir(): string {
  return filePathManager.getMaterialsDir();
}

// Ensure supplementary materials directory exists
export async function ensureMaterialsDir(): Promise<void> {
  const materialsPath = filePathManager.toPlatformPath(
    filePathManager.resolveFromBase(FILE_SYSTEM.materialsDirName)
  );
  try {
    await fs.access(materialsPath, constants.F_OK);
  } catch {
    await fs.mkdir(materialsPath, { recursive: true });
    console.log('Created supplementary materials directory:', materialsPath);
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
  const normalizedDir = filePathManager.normalizeToUnix(newDir);
  filePathManager.setBaseDir(normalizedDir);
  clearFileSystemState();
  ignoreRulesManager.setBaseDir(newDir);
}

export function getBaseDir() {
  return filePathManager.getBaseDir();
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

// Create .athignore file from template
export async function createAthignoreFile(
  content: string,
  targetPath: string
): Promise<void> {
  try {
    const normalizedPath = filePathManager.toPlatformPath(
      filePathManager.resolveFromBase(
        filePathManager.normalizeToUnix(targetPath)
      )
    );
    await fs.writeFile(normalizedPath, content, 'utf8');
  } catch (error) {
    console.error('Error creating .athignore:', error);
    throw error;
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

// Export core file system utilities that use proper path resolution
export const normalizePath =
  filePathManager.normalizeToUnix.bind(filePathManager);
export const toPlatformPath =
  filePathManager.toPlatformPath.bind(filePathManager);
export const resolveFromBase =
  filePathManager.resolveFromBase.bind(filePathManager);
export const normalizePathForIgnore =
  filePathManager.normalizeForIgnore.bind(filePathManager);
