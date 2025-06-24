// AI Summary: Handles Electron window creation, lifecycle management and error handling.
// Manages main window instance with proper web preferences and development/production
// environment handling. Implements window failure handling and cleanup.
import { BrowserWindow, app, screen } from 'electron';
import * as path from 'path';
import { settingsService } from './main';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

const isDev = process.env.NODE_ENV === 'development';

export let mainWindow: BrowserWindow | null = null;

/**
 * Gets the correct path to the application icon for the current platform.
 * This works in both development and packaged modes.
 */
export function getIconPath(): string {
  // Select the correct icon file based on the OS
  const platform = process.platform;
  let iconName: string;
  if (platform === 'win32') {
    iconName = 'athanor.ico';
  } else if (platform === 'darwin') {
    iconName = app.isPackaged ? 'athanor.icns' : 'athanor.png';
  } else {
    // Linux and others
    iconName = 'athanor.png';
  }

  // The path logic depends on whether the app is packaged.
  // This is the key change to make the packaged version work.
  if (app.isPackaged) {
    // In a packaged app, `extraResource` copies the `assets` directory into `process.resourcesPath`.
    return path.join(process.resourcesPath, 'assets', iconName);
  } else {
    // In development, `app.getAppPath()` points to the project root.
    return path.join(app.getAppPath(), 'assets', iconName);
  }
}

export async function createWindow() {
  const appSettings = await settingsService.getApplicationSettings();
  const lastWindowState = appSettings?.windowState;

  // Default values for first launch or invalid state
  const defaultSize = { width: 1200, height: 800 };

  // Helper to check if the last saved position is on a visible screen
  const isOnVisibleScreen = (
    state: typeof lastWindowState
  ): state is {
    width: number;
    height: number;
    x: number;
    y: number;
    isMaximized: boolean;
  } => {
    if (!state || typeof state.x !== 'number' || typeof state.y !== 'number')
      return false;

    // Capture the narrowed types in local constants to use them in the closure.
    const winX = state.x;
    const winY = state.y;

    const displays = screen.getAllDisplays();
    return displays.some((display) => {
      const { x, y, width, height } = display.bounds;
      // Check if the window's top-left corner is within the display bounds
      return winX >= x && winY >= y && winX < x + width && winY < y + height;
    });
  };

  const finalBounds = isOnVisibleScreen(lastWindowState)
    ? {
        width: lastWindowState.width,
        height: lastWindowState.height,
        x: lastWindowState.x,
        y: lastWindowState.y,
      }
    : defaultSize;

  // Create the browser window options
  const browserWindowOptions: Electron.BrowserWindowConstructorOptions = {
    width: finalBounds.width,
    height: finalBounds.height,
    ...('x' in finalBounds &&
      'y' in finalBounds && { x: finalBounds.x, y: finalBounds.y }),
    // Use the universal function to set the icon for all cases.
    icon: getIconPath(),
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  };

  // Create the browser window
  mainWindow = new BrowserWindow(browserWindowOptions);

  // Restore maximized state if applicable
  if (lastWindowState?.isMaximized) {
    mainWindow.maximize();
  }

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
