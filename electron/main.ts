// AI Summary: Main electron process that coordinates window management, file system operations,
// and IPC communication between processes. Handles application lifecycle events, path resolution,
// and uncaught exception handling with proper cleanup of file watchers.
import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { createWindow, mainWindow } from './windowManager';
import { setupIpcHandlers } from './ipcHandlers';
import { FileService } from './services/FileService';
import { SettingsService } from './services/SettingsService';
import { ApiKeyServiceMain } from './modules/secure-api-storage/main';
import { LLMServiceMain } from './modules/llm/main/LLMServiceMain';

// Create singleton instances
export const fileService = new FileService();
export const settingsService = new SettingsService(fileService);
export let apiKeyService: ApiKeyServiceMain;
export let llmService: LLMServiceMain;

// Get the base directory of the Athanor application
export function getAppBasePath(): string {
  return app.getAppPath();
}

// App lifecycle handlers
app.whenReady().then(async () => {
  await fileService.reloadIgnoreRules();
  
  // Initialize secure API key service
  apiKeyService = new ApiKeyServiceMain(app.getPath('userData'));
  
  // Initialize LLM service with API key service
  llmService = new LLMServiceMain(apiKeyService);
  
  setupIpcHandlers(fileService, settingsService, apiKeyService, llmService);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  fileService.cleanupWatchers().catch(err => {
    console.error('Error cleaning up FileService watchers:', err);
  });

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
