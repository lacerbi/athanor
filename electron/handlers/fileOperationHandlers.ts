// AI Summary: Handles IPC communication for file system operations including reading, writing,
// and deleting files with proper path normalization. Manages template path resolution,
// directory reading with ignore rules, and file content operations with error handling.
import { ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  getBaseDir,
  handleError,
  pathExists,
  getStats,
  normalizePathForIgnore,
  ensureDirectoryExists,
  normalizePath,
  toPlatformPath,
  ig,
} from '../fileSystemManager';
import { getAppBasePath } from '../main';

export function setupFileOperationHandlers() {
  // Handle getting template path
  ipcMain.handle('fs:getTemplatePath', async (_, templateName: string) => {
    try {
      const normalizedName = normalizePath(templateName);
      const templatePath = toPlatformPath(
        path.join(
          normalizePath(getAppBasePath()),
          'resources',
          'prompts',
          normalizedName
        )
      );
      return templatePath;
    } catch (error) {
      handleError(error, 'getting template path');
    }
  });

  // Handle reading directory contents with ignore rules
  ipcMain.handle('fs:readDirectory', async (_, dirPath: string) => {
    try {
      const normalizedPath = toPlatformPath(normalizePath(dirPath));
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
        const fullPath = path.join(normalizedPath, entry);
        const entryStats = await getStats(fullPath);
        const isDir = entryStats?.isDirectory() ?? false;

        const normalizedForIgnore = normalizePathForIgnore(fullPath, isDir);
        if (normalizedForIgnore && !ig.ignores(normalizedForIgnore)) {
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
        const normalizedPath = toPlatformPath(normalizePath(filePath));

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
      const normalizedPath = normalizePath(filePath);
      const absPath = toPlatformPath(
        path.resolve(getBaseDir(), normalizedPath)
      );
      const dirPath = path.dirname(absPath);

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
      const normalizedPath = normalizePath(filePath);
      const absPath = toPlatformPath(
        path.resolve(getBaseDir(), normalizedPath)
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
