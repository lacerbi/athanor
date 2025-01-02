// AI Summary: Handles Electron window creation, lifecycle management and error handling.
// Manages main window instance with proper web preferences and development/production
// environment handling. Implements window failure handling and cleanup.
import { BrowserWindow } from 'electron';
import * as path from 'path';

const isDev = process.env.NODE_ENV === 'development';
const DEV_SERVER_URL = 'http://localhost:8080';

export let mainWindow: BrowserWindow | null = null;

export async function createWindow() {
  const preloadPath = path.join(__dirname, 'main_window', 'preload.js');

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Load the app
  if (isDev) {
    console.log('Loading from dev server:', DEV_SERVER_URL);
    mainWindow.loadURL(DEV_SERVER_URL).catch((error) => {
      console.error('Failed to load dev server:', error);
    });
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow
      .loadFile(path.join(__dirname, '../dist/index.html'))
      .catch((error) => {
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
