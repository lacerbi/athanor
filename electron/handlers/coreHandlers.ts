// AI Summary: Handles core IPC operations for file system functionality including folder selection,
// path conversion, directory access, and ignore rule management. Manages folder dialogs,
// path normalization, and .athignore file operations with proper error handling.
import { ipcMain, dialog, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { mainWindow } from '../windowManager';
import {
  setBaseDir,
  loadIgnoreRules,
  normalizePath,
  ensureResourcesDir,
  toPlatformPath,
  cleanupWatchers,
  handleError,
  getBaseDir,
  getStats,
  pathExists,
  clearFileSystemState
} from '../fileSystemManager';
import { ignoreRulesManager } from '../ignoreRulesManager';

export function setupCoreHandlers() {
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

  // Add handler for converting to OS path
  ipcMain.handle('fs:toOSPath', async (_, inputPath: string) => {
    try {
      return path.resolve(inputPath);
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

  // Handle adding items to ignore file
  ipcMain.handle('fs:addToIgnore', async (_, itemPath: string) => {
    try {
      return await ignoreRulesManager.addIgnorePattern(itemPath);
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
        const selectedPath = normalizePath(result.filePaths[0]);
        
        // Verify folder access
        try {
          await fs.access(toPlatformPath(selectedPath), fs.constants.R_OK | fs.constants.W_OK);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Cannot access folder: ${errorMessage}`);
        }

        // Clear existing state and watchers
        clearFileSystemState();

        // Update directory and base path
        process.chdir(toPlatformPath(selectedPath));
        setBaseDir(selectedPath);

        // Ensure resources directory exists
        await ensureResourcesDir();

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
      const normalizedPath = toPlatformPath(normalizePath(filePath));
      const stats = await getStats(normalizedPath);
      return stats?.isDirectory() ?? false;
    } catch (error) {
      handleError(error, `checking directory status ${filePath}`);
    }
  });
}
