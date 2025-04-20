// AI Summary: Handles IPC communication for file system operations using FileService.
// Provides unified interface for reading/writing files, resolving template paths,
// and directory traversal with proper path handling and error management.

import { ipcMain } from 'electron';
import { FileService } from '../services/FileService';

// Store fileService instance
let _fileService: FileService;

export function setupFileOperationHandlers(fileService: FileService) {
  // Store the fileService instance for later use
  _fileService = fileService;

  // Handle getting resources path
  ipcMain.handle('fs:getResourcesPath', async () => {
    try {
      return await _fileService.getResourcesPath();
    } catch (error) {
      handleError(error, 'getting resources path');
    }
  });

  // Handle getting template path
  ipcMain.handle(
    'fs:getPromptTemplatePath',
    async (_, templateName: string) => {
      try {
        return await _fileService.getPromptTemplatePath(templateName);
      } catch (error) {
        handleError(error, 'getting template path');
      }
    }
  );

  // Handle reading directory contents with ignore rules
  ipcMain.handle('fs:readDirectory', async (_, dirPath: string, applyIgnores = true) => {
    try {
      // Convert input path to relative path if absolute
      const relativePath = _fileService.toUnix(dirPath).startsWith('/')
        ? _fileService.relativize(dirPath)
        : dirPath;

      return await _fileService.readdir(relativePath, { applyIgnores });
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
        // Convert options format if needed
        const readOptions =
          typeof options === 'string' ? { encoding: options } : options;

        // Convert input path to relative path if absolute
        const relativePath = _fileService.toUnix(filePath).startsWith('/')
          ? _fileService.relativize(filePath)
          : filePath;

        // Read the file
        return await _fileService.read(relativePath, readOptions);
      } catch (error) {
        handleError(error, `reading file ${filePath}`);
      }
    }
  );

  // Handle writing file contents
  ipcMain.handle('fs:writeFile', async (_, filePath: string, data: string) => {
    try {
      // Convert input path to relative path if absolute
      const relativePath = _fileService.toUnix(filePath).startsWith('/')
        ? _fileService.relativize(filePath)
        : filePath;

      await _fileService.write(relativePath, data);
      return true;
    } catch (error) {
      handleError(error, `writing file ${filePath}`);
    }
  });

  // Handle deleting files
  ipcMain.handle('fs:deleteFile', async (_, filePath: string) => {
    try {
      // Convert input path to relative path if absolute
      const relativePath = _fileService.toUnix(filePath).startsWith('/')
        ? _fileService.relativize(filePath)
        : filePath;

      await _fileService.remove(relativePath);
      return true;
    } catch (error) {
      handleError(error, `deleting file ${filePath}`);
    }
  });
}

// Enhanced error handling
function handleError(error: unknown, operation: string): never {
  console.error(`Error during ${operation}:`, error);
  throw error instanceof Error ? error : new Error(String(error));
}
