// AI Summary: Handles core IPC operations for file system functionality including folder selection,
// path conversion, directory access, and ignore rule management. Now uses FileService for all operations.

import { ipcMain, dialog, app } from 'electron';
import { mainWindow } from '../windowManager';
import { FileService } from '../services/FileService';

// Store fileService instance
let _fileService: FileService;

export function setupCoreHandlers(fileService: FileService) {
  // Store the fileService instance for later use
  _fileService = fileService;

  // Add handler for checking if file exists
  ipcMain.handle('fs:fileExists', async (_, filePath: string) => {
    try {
      return await _fileService.exists(filePath);
    } catch (error) {
      handleError(error, `checking if file exists: ${filePath}`);
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
      return _fileService.getBaseDir();
    } catch (error) {
      handleError(error, 'getting current directory');
    }
  });

  // Add handlers for path utilities
  ipcMain.handle('fs:normalizeToUnix', async (_, inputPath: string) => {
    try {
      return _fileService.toUnix(inputPath);
    } catch (error) {
      handleError(error, 'normalizing path to unix format');
    }
  });

  ipcMain.handle('fs:joinPaths', async (_, path1: string, path2: string) => {
    try {
      return _fileService.join(path1, path2);
    } catch (error) {
      handleError(error, 'joining paths');
    }
  });

  ipcMain.handle('fs:getBaseName', async (_, inputPath: string) => {
    try {
      return _fileService.basename(inputPath);
    } catch (error) {
      handleError(error, 'getting base name');
    }
  });

  // Add handler for converting to OS path
  ipcMain.handle('fs:toOSPath', async (_, inputPath: string) => {
    try {
      const normalizedPath = _fileService.toUnix(inputPath);
      
      // If input is already absolute, resolve it directly
      if (normalizedPath.startsWith('/')) {
        return _fileService.toOS(normalizedPath);
      }
      
      // Otherwise, resolve from base directory
      const resolvedPath = _fileService.resolve(normalizedPath);
      return _fileService.toOS(resolvedPath);
    } catch (error) {
      handleError(error, 'converting to OS path');
    }
  });

  // Add handler for reloading ignore rules
  ipcMain.handle('fs:reloadIgnoreRules', async () => {
    try {
      await _fileService.reloadIgnoreRules();
      return true;
    } catch (error) {
      handleError(error, 'reloading ignore rules');
    }
  });

  // Handle adding items to ignore file
  ipcMain.handle('fs:addToIgnore', async (_, itemPath: string, ignoreAll?: boolean) => {
    try {
      const resolvedIgnoreAll = ignoreAll ?? false;
      return await _fileService.addToIgnore(itemPath, resolvedIgnoreAll);
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
        const selectedPath = _fileService.toUnix(result.filePaths[0]);

        try {
          // Verify directory exists and has proper access
          const platformPath = _fileService.toOS(selectedPath);
          const fs = require('fs');
          await fs.promises.access(
            platformPath,
            fs.constants.R_OK | fs.constants.W_OK
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          throw new Error(`Cannot access folder: ${errorMessage}`);
        }

        // Set new base directory in FileService
        // (This will handle cleaning up old watchers, reloading ignore rules, etc.)
        await _fileService.setBaseDir(selectedPath);

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
      return await _fileService.isDirectory(filePath);
    } catch (error) {
      handleError(error, `checking directory status ${filePath}`);
    }
  });

  // Add handler for getting materials directory path
  ipcMain.handle('fs:getMaterialsDir', () => {
    try {
      return _fileService.getMaterialsDir();
    } catch (error) {
      handleError(error, 'getting materials directory path');
    }
  });

  // Add handler for getting project-relative path
  ipcMain.handle('fs:relativeToProject', async (_, targetPath: string) => {
    try {
      return _fileService.relativize(_fileService.toUnix(targetPath));
    } catch (error) {
      handleError(error, `resolving project-relative path for: ${targetPath}`);
    }
  });

  // Add handler for selecting project info file
  ipcMain.handle('fs:selectProjectInfoFile', async () => {
    try {
      const baseDir = _fileService.getBaseDir();
      if (!baseDir) {
        throw new Error('No project is currently open');
      }

      const result = await dialog.showOpenDialog(mainWindow!, {
        title: 'Select Project Information File',
        defaultPath: _fileService.toOS(baseDir),
        properties: ['openFile'],
        filters: [
          { name: 'Text Files', extensions: ['md', 'txt', 'log', 'json', 'xml', 'yaml', 'yml', 'ini', 'rst', 'adoc'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePaths.length) {
        return null;
      }

      const selectedPathAbs = _fileService.toUnix(result.filePaths[0]);
      const relativePath = _fileService.relativize(selectedPathAbs);
      
      // Validate that the selected file is within the project directory
      if (relativePath.startsWith('../') || relativePath === selectedPathAbs) {
        throw new Error('Selected file must be within the project directory');
      }

      return relativePath;
    } catch (error) {
      handleError(error, 'selecting project info file');
    }
  });
}

// Enhanced error handling
function handleError(error: unknown, operation: string): never {
  console.error(`Error during ${operation}:`, error);
  throw error instanceof Error ? error : new Error(String(error));
}
