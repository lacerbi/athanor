// AI Summary: Handles IPC communication for file system operations with comprehensive error handling
// and path normalization. Provides unified interface for reading/writing files, resolving template
// paths, and directory traversal with ignore rules. Key functions manage resource path resolution
// in both dev/prod environments and ensure proper directory structure.
import { app, ipcMain } from 'electron';
import * as fs from 'fs/promises';
import {
  getBaseDir,
  handleError,
  pathExists,
  getStats,
  ensureDirectoryExists,
} from '../fileSystemManager';
import { ignoreRulesManager } from '../ignoreRulesManager';
import { filePathManager } from '../filePathManager';
import { getAppBasePath } from '../main';

// Get resources path based on environment
async function getResourcesPath(): Promise<string> {
  const baseFolder = app.isPackaged
    ? filePathManager.getParentDir(filePathManager.normalizeToUnix(app.getPath('exe')))
    : filePathManager.normalizeToUnix(getAppBasePath());
    
  return filePathManager.resolveUnixPath(baseFolder, 'resources');
}

export function setupFileOperationHandlers() {
  // Handle getting resources path
  ipcMain.handle('fs:getResourcesPath', async () => {
    try {
      return await getResourcesPath();
    } catch (error) {
      handleError(error, 'getting resources path');
    }
  });

  // Handle getting template path
  ipcMain.handle(
    'fs:getPromptTemplatePath',
    async (_, templateName: string) => {
      try {
        const normalizedName = filePathManager.normalizeToUnix(templateName);
        const resourcesPath = await getResourcesPath();

        return filePathManager.toPlatformPath(
          filePathManager.joinUnixPaths(resourcesPath, 'prompts', normalizedName)
        );
      } catch (error) {
        handleError(error, 'getting template path');
      }
    }
  );

  // Handle reading directory contents with ignore rules
  ipcMain.handle('fs:readDirectory', async (_, dirPath: string) => {
    try {
      const normalizedPath = filePathManager.toPlatformPath(
        filePathManager.normalizeToUnix(dirPath)
      );
      const exists = await pathExists(normalizedPath);
      if (!exists) {
        throw new Error(`Directory does not exist: ${normalizedPath}`);
      }

      const stats = await getStats(normalizedPath);
      if (!stats?.isDirectory()) {
        throw new Error(`Path is not a directory: ${normalizedPath}`);
      }

      const entries = await fs.readdir(normalizedPath);
      const filteredEntries: string[] = [];

      for (const entry of entries) {
        const fullPath = filePathManager.joinUnixPaths(normalizedPath, entry);
        const entryStats = await getStats(fullPath);
        const isDir = entryStats?.isDirectory() ?? false;

        const normalizedForIgnore = filePathManager.normalizeForIgnore(fullPath, isDir);
        if (normalizedForIgnore && !ignoreRulesManager.ignores(normalizedForIgnore)) {
          filteredEntries.push(entry);
        }
      }

      return filteredEntries;
    } catch (error) {
      handleError(error, `reading directory ${dirPath}`);
    }
  });

  // Handle reading file contents
  ipcMain.handle(
    'fs:readFile',
    async (
      _,
      filePath: string,
      options?: { encoding?: BufferEncoding } | BufferEncoding
    ) => {
      try {
        const normalizedPath = filePathManager.toPlatformPath(
          filePathManager.normalizeToUnix(filePath)
        );

        const exists = await pathExists(normalizedPath);
        if (!exists) {
          throw new Error(`File does not exist: ${normalizedPath}`);
        }

        const stats = await getStats(normalizedPath);
        if (!stats?.isFile()) {
          throw new Error(`Path is not a file: ${normalizedPath}`);
        }

        const readOptions =
          typeof options === 'string' ? { encoding: options } : options;
        const content = await fs.readFile(normalizedPath, readOptions);
        return content;
      } catch (error) {
        handleError(error, `reading file ${filePath}`);
      }
    }
  );

  // Handle writing file contents
  ipcMain.handle('fs:writeFile', async (_, filePath: string, data: string) => {
    try {
      const normalizedPath = filePathManager.normalizeToUnix(filePath);
      const absPath = filePathManager.toPlatformPath(
        filePathManager.resolveFromBase(normalizedPath)
      );
      const dirPath = filePathManager.getParentDir(absPath);

      await ensureDirectoryExists(dirPath);

      const normalizedData = data.replace(/\r\n/g, '\n');
      await fs.writeFile(absPath, normalizedData, 'utf8');
    } catch (error) {
      handleError(error, `writing file ${filePath}`);
    }
  });

  // Handle deleting files
  ipcMain.handle('fs:deleteFile', async (_, filePath: string) => {
    try {
      const normalizedPath = filePathManager.normalizeToUnix(filePath);
      const absPath = filePathManager.toPlatformPath(
        filePathManager.resolveFromBase(normalizedPath)
      );
      const exists = await pathExists(absPath);
      if (!exists) {
        throw new Error(`File does not exist: ${filePath}`);
      }

      await fs.unlink(absPath);
    } catch (error) {
      handleError(error, `deleting file ${filePath}`);
    }
  });
}
