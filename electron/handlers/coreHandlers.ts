// AI Summary: Handles core IPC operations for file system functionality including folder selection,
// path conversion, directory access, and ignore rule management. Now uses FileService for all operations.

import { ipcMain, dialog, app, nativeTheme, shell } from 'electron';
import { mainWindow } from '../windowManager';
import { FileService } from '../services/FileService';
import { SettingsService } from '../services/SettingsService';
import { CUSTOM_TEMPLATES } from '../../src/utils/constants';

// Store service instances
let _fileService: FileService;
let _settingsService: SettingsService;

// Define channel name for confirmation dialog
const SHOW_CONFIRM_DIALOG_CHANNEL = 'dialog:show-confirm-dialog';

export function setupCoreHandlers(
  fileService: FileService,
  settingsService: SettingsService
) {
  // Store the service instances for later use
  _fileService = fileService;
  _settingsService = settingsService;

  // Add handler for confirmation dialog
  ipcMain.handle(
    SHOW_CONFIRM_DIALOG_CHANNEL,
    async (_event, message: string, title?: string): Promise<boolean> => {
      try {
        if (!mainWindow) {
          console.error(
            'Main window not available for dialog. Showing dialog without parent.'
          );
          // Fallback: Show dialog without a parent if mainWindow is somehow null
          const resultNoParent = await dialog.showMessageBox({
            type: 'question',
            buttons: ['OK', 'Cancel'],
            defaultId: 0, // OK
            cancelId: 1, // Cancel
            message: message,
            title: title || 'Confirmation',
          });
          return resultNoParent.response === 0;
        }

        const result = await dialog.showMessageBox(mainWindow, {
          type: 'question',
          buttons: ['OK', 'Cancel'],
          defaultId: 0, // OK is the default
          cancelId: 1, // Cancel is the second button
          message: message,
          title: title || 'Confirmation',
        });
        return result.response === 0; // 0 for 'OK'
      } catch (error) {
        handleError(error, `showing confirmation dialog: ${message}`);
        return false; // Ensure a boolean is returned in case of error
      }
    }
  );

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

  // Add handler for getting initial project path
  ipcMain.handle('app:get-initial-path', async () => {
    try {
      // Priority 1: Check for a path provided via CLI
      const cliPath = _fileService.cliPath;
      if (cliPath) {
        const exists = await _fileService.exists(cliPath);
        const isDir = await _fileService.isDirectory(cliPath);
        if (exists && isDir) {
          console.log(`[Athanor] Opening project from CLI path: ${cliPath}`);
          return cliPath;
        }
      }

      // Priority 2: Fallback to the last opened project from settings
      const applicationSettings =
        await _settingsService.getApplicationSettings();

      // If no last opened project path, return null
      if (!applicationSettings?.lastOpenedProjectPath) {
        return null;
      }

      const lastPath = applicationSettings.lastOpenedProjectPath;

      // Check if the directory exists
      const exists = await _fileService.exists(lastPath);
      if (!exists) {
        return null;
      }

      // Check if it's a directory
      const isDir = await _fileService.isDirectory(lastPath);
      if (!isDir) {
        return null;
      }

      // Check if it contains .athignore file (indicating it's a valid Athanor project)
      const athignorePath = _fileService.join(lastPath, '.athignore');
      const hasAthignore = await _fileService.exists(athignorePath);
      if (!hasAthignore) {
        return null;
      }

      // All checks passed, return the path
      return lastPath;
    } catch (error) {
      console.error('Error getting initial project path:', error);
      return null;
    }
  });

  // Add handler for getting user data path
  ipcMain.handle('app:get-user-data-path', () => {
    try {
      return app.getPath('userData');
    } catch (error) {
      handleError(error, 'getting user data path');
    }
  });

  // Add handler for getting initial dark mode preference
  ipcMain.handle('get-initial-dark-mode', () => {
    try {
      return nativeTheme.shouldUseDarkColors;
    } catch (error) {
      handleError(error, 'getting initial dark mode preference');
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
  ipcMain.handle(
    'fs:addToIgnore',
    async (_, itemPath: string, ignoreAll?: boolean) => {
      try {
        const resolvedIgnoreAll = ignoreAll ?? false;
        return await _fileService.addToIgnore(itemPath, resolvedIgnoreAll);
      } catch (error) {
        handleError(error, `adding to ignore file: ${itemPath}`);
      }
    }
  );

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

        return selectedPath;
      }
      return null;
    } catch (error) {
      handleError(error, 'opening folder dialog');
    }
  });

  // Add handler for setting the base directory programmatically
  ipcMain.handle('fs:setBaseDirectory', async (_, directoryPath: string) => {
    try {
      await _fileService.setBaseDir(directoryPath);
    } catch (error) {
      handleError(error, `setting base directory to: ${directoryPath}`);
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
          {
            name: 'Text Files',
            extensions: [
              'md',
              'txt',
              'log',
              'json',
              'xml',
              'yaml',
              'yml',
              'ini',
              'rst',
              'adoc',
            ],
          },
          { name: 'All Files', extensions: ['*'] },
        ],
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

  // Add handler for opening external URLs
  ipcMain.handle('shell:openExternal', async (_, url: string) => {
    try {
      await shell.openExternal(url);
    } catch (error) {
      handleError(error, `opening external URL: ${url}`);
    }
  });

  // Add handler for opening local paths
  ipcMain.handle('shell:openPath', async (_, path: string) => {
    try {
      await shell.openPath(path);
    } catch (error) {
      handleError(error, `opening path: ${path}`);
    }
  });

  // Add handler for getting global custom prompts directory path
  ipcMain.handle('app:getGlobalPromptsPath', () => {
    try {
      const userDataPath = app.getPath('userData');
      const unixUserDataPath = _fileService.toUnix(userDataPath);
      return _fileService.join(
        unixUserDataPath,
        CUSTOM_TEMPLATES.USER_PROMPTS_DIR_NAME
      );
    } catch (error) {
      handleError(error, 'getting global prompts path');
    }
  });

  // Add handler for getting project-specific custom prompts directory path
  ipcMain.handle('app:getProjectPromptsPath', () => {
    try {
      const materialsDir = _fileService.getMaterialsDir();
      return _fileService.join(
        materialsDir,
        CUSTOM_TEMPLATES.USER_PROMPTS_DIR_NAME
      );
    } catch (error) {
      handleError(error, 'getting project prompts path');
    }
  });
}

// Enhanced error handling
function handleError(error: unknown, operation: string): never {
  console.error(`Error during ${operation}:`, error);
  throw error instanceof Error ? error : new Error(String(error));
}
