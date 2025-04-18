// AI Summary: Handles core IPC operations for file system functionality including folder selection,
// path conversion, directory access, and ignore rule management. Now supports ignoreAll param to addToIgnore.

import { ipcMain, dialog, app } from 'electron';
import * as fs from 'fs/promises';
import { mainWindow } from '../windowManager';
import {
  setBaseDir,
  loadIgnoreRules,
  getStats,
  pathExists,
  clearFileSystemState,
  handleError,
  getBaseDir,
  ensureMaterialsDir,
  getMaterialsDir,
} from '../fileSystemManager';
import { ignoreRulesManager } from '../ignoreRulesManager';
import { filePathManager } from '../filePathManager';

export function setupCoreHandlers() {
  // Add handler for checking if file exists
  ipcMain.handle('fs:fileExists', async (_, filePath: string) => {
    try {
      const normalizedPath = filePathManager.toPlatformPath(
        filePathManager.resolveFromBase(
          filePathManager.normalizeToUnix(filePath)
        )
      );
      await fs.access(normalizedPath);
      return true;
    } catch {
      return false;
    }
  });

  // Add handler for getting app version
  ipcMain.handle('app:version', () => {
    try {
      return app.getVersion();
    } catch (error) {
      handleError(error, 'getting app version');
    }
  });

  // Add handler for getting current directory
  ipcMain.handle('fs:getCurrentDirectory', () => {
    try {
      return getBaseDir();
    } catch (error) {
      handleError(error, 'getting current directory');
    }
  });

  // Add handlers for path utilities
  ipcMain.handle('fs:normalizeToUnix', async (_, inputPath: string) => {
    try {
      return filePathManager.normalizeToUnix(inputPath);
    } catch (error) {
      handleError(error, 'normalizing path to unix format');
    }
  });

  ipcMain.handle('fs:joinPaths', async (_, path1: string, path2: string) => {
    try {
      return filePathManager.joinUnixPaths(path1, path2);
    } catch (error) {
      handleError(error, 'joining paths');
    }
  });

  ipcMain.handle('fs:getBaseName', async (_, inputPath: string) => {
    try {
      return filePathManager.getBaseName(inputPath);
    } catch (error) {
      handleError(error, 'getting base name');
    }
  });

  // Add handler for converting to OS path
  ipcMain.handle('fs:toOSPath', async (_, inputPath: string) => {
    try {
      const normalizedPath = filePathManager.normalizeToUnix(inputPath);
      const resolvedPath = filePathManager.resolveFromBase(normalizedPath);
      return filePathManager.toPlatformPath(resolvedPath);
    } catch (error) {
      handleError(error, 'converting to OS path');
    }
  });

  // Add handler for reloading ignore rules
  ipcMain.handle('fs:reloadIgnoreRules', async () => {
    try {
      await loadIgnoreRules();
      return true;
    } catch (error) {
      handleError(error, 'reloading ignore rules');
    }
  });

  // Handle adding items to ignore file (now with ignoreAll param)
  ipcMain.handle('fs:addToIgnore', async (_, itemPath: string, ignoreAll?: boolean) => {
    try {
      const resolvedIgnoreAll = ignoreAll ?? false;
      return await ignoreRulesManager.addIgnorePattern(itemPath, resolvedIgnoreAll);
    } catch (error) {
      handleError(error, `adding to ignore file: ${itemPath}`);
    }
  });

  // Handle opening folder dialog with full refresh
  ipcMain.handle('fs:openFolder', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openDirectory'],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const selectedPath = filePathManager.normalizeToUnix(
          result.filePaths[0]
        );

        // Verify folder access
        try {
          await fs.access(
            filePathManager.toPlatformPath(selectedPath),
            fs.constants.R_OK | fs.constants.W_OK
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          throw new Error(`Cannot access folder: ${errorMessage}`);
        }

        // Clear existing state
        clearFileSystemState();

        // Update directory and base path
        process.chdir(filePathManager.toPlatformPath(selectedPath));
        setBaseDir(selectedPath);

        // Ensure supplementary materials directory exists
        await ensureMaterialsDir();

        // Load new ignore rules
        await loadIgnoreRules();

        // Notify renderer of successful folder change
        if (mainWindow?.webContents && !mainWindow.webContents.isDestroyed()) {
          mainWindow.webContents.send('fs:folderChanged', selectedPath);
        }

        return selectedPath;
      }
      return null;
    } catch (error) {
      // Ensure renderer is notified of errors
      if (mainWindow?.webContents && !mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.send('fs:error', String(error));
      }
      handleError(error, 'opening folder dialog');
    }
  });

  // Add handler for checking if path is directory
  ipcMain.handle('fs:isDirectory', async (_, filePath: string) => {
    try {
      const normalizedPath = filePathManager.toPlatformPath(
        filePathManager.resolveFromBase(
          filePathManager.normalizeToUnix(filePath)
        )
      );
      const stats = await getStats(normalizedPath);
      return stats?.isDirectory() ?? false;
    } catch (error) {
      handleError(error, `checking directory status ${filePath}`);
    }
  });

  // Add handler for getting materials directory path
  ipcMain.handle('fs:getMaterialsDir', () => {
    try {
      return getMaterialsDir();
    } catch (error) {
      handleError(error, 'getting materials directory path');
    }
  });

  // Add handler for getting project-relative path
  ipcMain.handle('fs:relativeToProject', async (_, targetPath: string) => {
    try {
      const normalized = filePathManager.normalizeToUnix(targetPath);
      const resolved = filePathManager.resolveFromBase(normalized);
      return filePathManager.relativeToCwd(resolved);
    } catch (error) {
      handleError(error, `resolving project-relative path for: ${targetPath}`);
    }
  });
}
