// AI Summary: Main electron process that coordinates window management, file system operations,
// and IPC communication between processes. Handles application lifecycle events, path resolution,
// and uncaught exception handling with proper cleanup of file watchers.
import { app, BrowserWindow, Menu, nativeTheme, ipcMain } from 'electron';
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

// Dynamic menu builder function
async function buildMenu() {
  try {
    const appSettings = await settingsService.getApplicationSettings();
    const recentProjects = appSettings?.recentProjectPaths || [];

    const recentProjectsMenu: Electron.MenuItemConstructorOptions[] =
      recentProjects.length > 0
        ? recentProjects.map((projectPath) => ({
            label: projectPath,
            click: () => {
              mainWindow?.webContents.send('menu:open-path', projectPath);
            },
          }))
        : [{ label: 'No Recent Projects', enabled: false }];

    // Read package.json for About panel information
    const packageJson = require('../package.json');

    // Create application menu template
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
          {
            label: 'Open Folder...',
            accelerator: 'CmdOrCtrl+O',
            click: () => {
              mainWindow?.webContents.send('menu:open-folder');
            },
          },
          { type: 'separator' as const },
          {
            label: 'Open Recent',
            submenu: recentProjectsMenu,
          },
          { type: 'separator' as const },
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
  } catch (error) {
    console.error('Error building menu:', error);
  }
}

// App lifecycle handlers
app.whenReady().then(async () => {
  await fileService.reloadIgnoreRules();

  // Initialize secure API key service
  apiKeyService = new ApiKeyServiceMain(app.getPath('userData'));

  // Initialize LLM service with API key service
  llmService = new LLMServiceMain(apiKeyService);

  // Handle CLI argument for opening a project
  const args = process.argv.slice(app.isPackaged ? 1 : 2);
  const potentialPath = args.find(arg => !arg.startsWith('-'));
  
  if (potentialPath) {
    const absolutePath = path.resolve(potentialPath);
    try {
      // Use fileService to check if the path is a valid directory
      if (await fileService.isDirectory(absolutePath)) {
        fileService.cliPath = fileService.toUnix(absolutePath);
        console.log(`[Athanor] CLI project path specified: ${fileService.cliPath}`);
      } else {
        console.warn(`[Athanor] CLI path is not a directory, ignoring: ${absolutePath}`);
      }
    } catch (error) {
      // This can happen if the path does not exist at all
      console.warn(`[Athanor] Invalid CLI path provided, ignoring: ${absolutePath}`, error);
    }
  }

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

  // Set up menu rebuild listener and build initial menu
  ipcMain.on('app:rebuild-menu', buildMenu);
  await buildMenu();

  createWindow();

  // Listen for system theme changes and notify renderer
  nativeTheme.on('updated', () => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send('native-theme-updated', nativeTheme.shouldUseDarkColors);
    }
  });

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
