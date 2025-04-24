// AI Summary: Handles IPC communication for file system operations using FileService.
// Provides unified interface for reading/writing files, resolving template paths,
// and directory traversal with proper path handling and error management.

import { ipcMain } from 'electron';
import { FileService } from '../services/FileService';
import { PathUtils } from '../services/PathUtils';

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
      // Normalize to Unix format
      const unix = _fileService.toUnix(dirPath);
      
      // Only relativize if absolute AND inside base directory
      const pathForFs = 
        PathUtils.isAbsolute(unix) && PathUtils.isPathInside(_fileService.getBaseDir(), unix)
          ? _fileService.relativize(unix)
          : unix;  // absolute path outside project or already relative, use as-is

      return await _fileService.readdir(pathForFs, { applyIgnores });
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

        // Normalize to Unix format
        const unix = _fileService.toUnix(filePath);
        
        // Only relativize if absolute AND inside base directory
        const pathForFs = 
          PathUtils.isAbsolute(unix) && PathUtils.isPathInside(_fileService.getBaseDir(), unix)
            ? _fileService.relativize(unix)
            : unix;  // absolute path outside project or already relative, use as-is

        // Read the file
        return await _fileService.read(pathForFs, readOptions);
      } catch (error) {
        handleError(error, `reading file ${filePath}`);
      }
    }
  );

  // Handle writing file contents
  ipcMain.handle('fs:writeFile', async (_, filePath: string, data: string) => {
    try {
      // Normalize to Unix format
      const unix = _fileService.toUnix(filePath);
      
      // Only relativize if absolute AND inside base directory
      const pathForFs = 
        PathUtils.isAbsolute(unix) && PathUtils.isPathInside(_fileService.getBaseDir(), unix)
          ? _fileService.relativize(unix)
          : unix;  // absolute path outside project or already relative, use as-is

      await _fileService.write(pathForFs, data);
      return true;
    } catch (error) {
      handleError(error, `writing file ${filePath}`);
    }
  });

  // Handle deleting files
  ipcMain.handle('fs:deleteFile', async (_, filePath: string) => {
    try {
      // Normalize to Unix format
      const unix = _fileService.toUnix(filePath);
      
      // Only relativize if absolute AND inside base directory
      const pathForFs = 
        PathUtils.isAbsolute(unix) && PathUtils.isPathInside(_fileService.getBaseDir(), unix)
          ? _fileService.relativize(unix)
          : unix;  // absolute path outside project or already relative, use as-is

      await _fileService.remove(pathForFs);
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
