// AI Summary: Main electron process that coordinates window management, file system operations,
// and IPC communication between processes. Handles application lifecycle events, path resolution,
// and uncaught exception handling with proper cleanup of file watchers.
import { app, BrowserWindow, Menu } from 'electron';
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

  // Read package.json for About panel information
  const packageJson = require('../package.json');

  // Configure About panel
  app.setAboutPanelOptions({
    applicationName:
      packageJson.name.charAt(0).toUpperCase() + packageJson.name.slice(1),
    applicationVersion: `Version ${packageJson.version}`,
    authors: [packageJson.author],
    copyright: `Copyright © ${new Date().getFullYear()} ${packageJson.author}`,
    credits: `${packageJson.description}`,
  });

  // Create application menu
  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    // macOS app menu
    ...(process.platform === 'darwin'
      ? [
          {
            label: app.getName(),
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ] as Electron.MenuItemConstructorOptions[],
          },
        ]
      : []),
    // File menu
    {
      label: 'File',
      submenu: [
        process.platform === 'darwin'
          ? { role: 'close' as const }
          : { role: 'quit' as const },
      ],
    },
    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        ...(process.platform === 'darwin'
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
              { type: 'separator' as const },
              {
                label: 'Speech',
                submenu: [
                  { role: 'startSpeaking' as const },
                  { role: 'stopSpeaking' as const },
                ],
              },
            ]
          : [
              { role: 'delete' as const },
              { type: 'separator' as const },
              { role: 'selectAll' as const },
            ]),
      ],
    },
    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },
    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(process.platform === 'darwin'
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : [{ role: 'close' as const }]),
      ],
    },
    // Help menu
    {
      role: 'help' as const,
      submenu: [
        {
          label: `About ${packageJson.name.charAt(0).toUpperCase() + packageJson.name.slice(1)}`,
          role: 'about' as const,
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  fileService.cleanupWatchers().catch((err) => {
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
