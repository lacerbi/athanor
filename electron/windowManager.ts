// AI Summary: Handles Electron window creation, lifecycle management and error handling.
// Manages main window instance with proper web preferences and development/production
// environment handling. Implements window failure handling and cleanup.
import { BrowserWindow, app } from 'electron';
import * as path from 'path';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

const isDev = process.env.NODE_ENV === 'development';

export let mainWindow: BrowserWindow | null = null;

export async function createWindow() {
  // Create the browser window options
  const browserWindowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1200,
    height: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  };

  // Set icon for development mode with platform-specific handling
  if (isDev) {
    let iconPath: string;
    const platform = process.platform;
    const appPath = app.getAppPath();

    if (platform === 'win32') {
      iconPath = path.join(appPath, 'resources', 'images', 'athanor.ico');
    } else if (platform === 'darwin') {
      iconPath = path.join(appPath, 'resources', 'images', 'athanor.icns');
    } else {
      // Linux and other platforms
      iconPath = path.join(appPath, 'resources', 'images', 'athanor.png');
    }

    console.log('Setting dev icon path:', iconPath);
    browserWindowOptions.icon = iconPath;
  }

  // Create the browser window
  mainWindow = new BrowserWindow(browserWindowOptions);

  // Load the app
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools automatically in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window failures
  mainWindow.webContents.on(
    'did-fail-load',
    (_, errorCode, errorDescription) => {
      console.error('Failed to load:', errorCode, errorDescription);
    }
  );

  // Cleanup on window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}
