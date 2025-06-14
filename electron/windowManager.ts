// AI Summary: Handles Electron window creation, lifecycle management and error handling.
// Manages main window instance with proper web preferences and development/production
// environment handling. Implements window failure handling and cleanup.
import { BrowserWindow, app } from 'electron';
import * as path from 'path';

const isDev = process.env.NODE_ENV === 'development';
const DEV_SERVER_URL = 'http://localhost:8080';

export let mainWindow: BrowserWindow | null = null;

export async function createWindow() {
  const preloadPath = isDev
    ? //    ? path.join(__dirname, 'main_window', 'preload.js') // Dev path
      path.join(__dirname, 'renderer', 'main_window', 'preload.js') // Dev path
    : path.join(__dirname, 'renderer', 'main_window', 'preload.js'); // Production path

  // Create the browser window options
  const browserWindowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
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
  if (isDev) {
    console.log('Loading from dev server:', DEV_SERVER_URL);
    mainWindow.loadURL(DEV_SERVER_URL).catch((error) => {
      console.error('Failed to load dev server:', error);
    });
    mainWindow.webContents.openDevTools();
  } else {
    const prodHtmlPath = path.join(
      __dirname,
      'renderer',
      'main_window',
      'index.html'
    );
    console.log('Loading production html from:', prodHtmlPath);
    mainWindow.loadFile(prodHtmlPath).catch((error) => {
      console.error('Failed to load index.html:', error);
    });
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
