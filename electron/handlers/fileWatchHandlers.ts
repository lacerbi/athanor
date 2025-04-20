// AI Summary: Handles IPC communication for file system watching using FileService.
// Sets up directory watchers with proper path handling and event forwarding to renderer.

import { ipcMain } from 'electron';
import { FileService } from '../services/FileService';

// Store fileService instance
let _fileService: FileService;
// Store active unsubscribe functions by watcher path
const unsubscribeFunctions = new Map<string, () => void>();

export function setupFileWatchHandlers(fileService: FileService) {
  // Store the fileService instance for later use
  _fileService = fileService;

  // Handle directory watching with ignore rules
  ipcMain.handle('fs:watch', (event, dirPath: string) => {
    try {
      // Convert input path to relative path if absolute
      const relativePath = _fileService.toUnix(dirPath).startsWith('/')
        ? _fileService.relativize(dirPath)
        : dirPath;

      // Generate a consistent key for this watcher
      const watcherKey = relativePath;
      
      console.log(`Setting up watcher for: ${relativePath}`);

      // Clean up existing watcher if any
      if (unsubscribeFunctions.has(watcherKey)) {
        unsubscribeFunctions.get(watcherKey)?.();
        unsubscribeFunctions.delete(watcherKey);
        console.log(`Cleaned up existing watcher for: ${watcherKey}`);
      }

      // Set up new watcher with FileService
      const unsubscribe = _fileService.watch(relativePath, (eventName, filePath) => {
        if (!event.sender.isDestroyed()) {
          // Forward the event to the renderer process
          event.sender.send('fs:change', eventName, filePath);
        }
      });

      // Store the unsubscribe function
      unsubscribeFunctions.set(watcherKey, unsubscribe);
      
      console.log(`Watcher established for: ${watcherKey}`);
      return true;
    } catch (error) {
      console.error('Error setting up file watcher:', error);
      
      // Notify renderer of the error
      if (!event.sender.isDestroyed()) {
        event.sender.send(
          'fs:error',
          error instanceof Error ? error.message : 'Unknown watcher error'
        );
      }
      
      throw error;
    }
  });

  // Cleanup all watchers when requested
  ipcMain.handle('fs:cleanupWatchers', () => {
    try {
      // Call all unsubscribe functions
      for (const [key, unsubscribe] of unsubscribeFunctions.entries()) {
        unsubscribe();
        console.log(`Cleaned up watcher for: ${key}`);
      }
      
      // Clear the map
      unsubscribeFunctions.clear();
      return true;
    } catch (error) {
      console.error('Error cleaning up watchers:', error);
      throw error;
    }
  });
}
