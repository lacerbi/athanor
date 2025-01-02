// AI Summary: Main electron process that coordinates window management, file system operations,
// and IPC communication between processes. Handles application lifecycle events, path resolution,
// and uncaught exception handling with proper cleanup of file watchers.
import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { createWindow, mainWindow } from './windowManager';
import { loadIgnoreRules, cleanupWatchers } from './fileSystemManager';
import { setupIpcHandlers } from './ipcHandlers';

// Get the base directory of the Athanor application
export function getAppBasePath(): string {
  if (app.isPackaged) {
    // In production, use the resources path
    return process.resourcesPath;
  } else {
    // In development, use the project root
    return app.getAppPath();
  }
}

// App lifecycle handlers
app.whenReady().then(async () => {
  await loadIgnoreRules();
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  cleanupWatchers();

  // Quit on all windows closed (except on macOS)
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // Attempt to send error to renderer if window exists
  if (mainWindow?.webContents && !mainWindow.webContents.isDestroyed()) {
    mainWindow.webContents.send('fs:error', String(error));
  }
});
