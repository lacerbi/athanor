// AI Summary: Exposes protected methods for IPC communication and file system operations
// including OS path conversion. Provides bridge between renderer process and main process
// for file system access and monitoring with proper channel validation.
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  send: (channel: string, data: any) => {
    const validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel: string, func: (...args: any[]) => void) => {
    const validChannels = ['fromMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
});

// Expose file system methods
contextBridge.exposeInMainWorld('fileSystem', {
  openFolder: () => ipcRenderer.invoke('fs:openFolder'),
  readDirectory: (path: string) => ipcRenderer.invoke('fs:readDirectory', path),
  isDirectory: (path: string) => ipcRenderer.invoke('fs:isDirectory', path),
  getCurrentDirectory: () => ipcRenderer.invoke('fs:getCurrentDirectory'),
  getTemplatePath: (templateName: string) =>
    ipcRenderer.invoke('fs:getTemplatePath', templateName),
  reloadIgnoreRules: () => ipcRenderer.invoke('fs:reloadIgnoreRules'),
  toOSPath: (path: string) => ipcRenderer.invoke('fs:toOSPath', path),
  watchDirectory: async (
    path: string,
    callback: (event: string, filename: string) => void
  ) => {
    ipcRenderer.removeAllListeners('fs:change');
    ipcRenderer.removeAllListeners('fs:error');

    ipcRenderer.on('fs:change', (_, event, filename) =>
      callback(event, filename)
    );
    ipcRenderer.on('fs:error', (_, error) =>
      console.error('File system error:', error)
    );

    return await ipcRenderer.invoke('fs:watch', path);
  },
  readFile: (
    path: string,
    options?: { encoding?: BufferEncoding } | BufferEncoding
  ) => ipcRenderer.invoke('fs:readFile', path, options),
  writeFile: (path: string, data: string) =>
    ipcRenderer.invoke('fs:writeFile', path, data),
  deleteFile: (path: string) => ipcRenderer.invoke('fs:deleteFile', path),
  addToIgnore: (itemPath: string) =>
    ipcRenderer.invoke('fs:addToIgnore', itemPath),
});
