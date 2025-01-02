// AI Summary: Handles IPC communication for file system watching and monitoring
// with proper cleanup and error handling. Manages Chokidar watchers with ignore rules,
// file change events, and watcher lifecycle management.
import { ipcMain } from 'electron';
import { statSync } from 'fs';
import * as chokidar from 'chokidar';
import {
  activeWatchers,
  normalizePathForIgnore,
  normalizePath,
  toPlatformPath,
  ig,
} from '../fileSystemManager';

export function setupFileWatchHandlers() {
  // Handle directory watching with ignore rules
  ipcMain.handle('fs:watch', (event, dirPath: string) => {
    try {
      const normalizedPath = toPlatformPath(normalizePath(dirPath));

      // Clean up existing watcher if any
      if (activeWatchers.has(normalizedPath)) {
        activeWatchers.get(normalizedPath)?.close();
        activeWatchers.delete(normalizedPath);
      }

      // Set up new watcher with ignore rules
      const watcher = chokidar.watch(normalizedPath, {
        ignored: (filePath: string) => {
          if (!filePath) return true;

          try {
            const stats = statSync(filePath);
            const normalizedForIgnore = normalizePathForIgnore(
              filePath,
              stats.isDirectory()
            );
            return normalizedForIgnore ? ig.ignores(normalizedForIgnore) : true;
          } catch (error) {
            return true;
          }
        },
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 500,
          pollInterval: 100,
        },
      });

      // Set up event handlers
      const events = [
        'add',
        'change',
        'unlink',
        'addDir',
        'unlinkDir',
      ] as const;

      events.forEach((eventName) => {
        watcher.on(eventName, (filePath) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send('fs:change', eventName, filePath);
          }
        });
      });

      // Handle errors
      watcher.on('error', (error) => {
        console.error('Watcher error:', error);
        if (!event.sender.isDestroyed()) {
          event.sender.send(
            'fs:error',
            error instanceof Error ? error.message : 'Unknown watcher error'
          );
        }
      });

      activeWatchers.set(normalizedPath, watcher);
      return true;
    } catch (error) {
      console.error('Error setting up file watcher:', error);
      throw error;
    }
  });
}
