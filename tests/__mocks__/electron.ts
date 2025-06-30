// AI Summary: Provides a basic mock for the 'electron' module to isolate main process code in unit tests.
// Stubs out core components like `app`, `dialog`, and `ipcMain` to prevent test failures from missing Electron APIs.
export const ipcMain = {};
export const app = { isPackaged: false, getAppPath: () => '/fake/app' };
export const dialog = {
  showErrorBox: () => {},
  showMessageBox: () => Promise.resolve({ response: 0 }), // 0 for 'OK'
  showOpenDialog: () => Promise.resolve({ canceled: true, filePaths: [] }),
};
export const BrowserWindow = function () {};
// add tiny stubs only as you need them
