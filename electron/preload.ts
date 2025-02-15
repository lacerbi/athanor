// AI Summary: Exposes protected methods for IPC communication and file system operations
// including OS path conversion. Provides bridge between renderer process and main process
// for file system access and monitoring with proper channel validation.

import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods for IPC communication and file system operations
// including path normalization. Provides bridge between renderer process and main process
// for file system access and monitoring with proper path handling.
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

// Expose app version
contextBridge.exposeInMainWorld('app', {
  getVersion: () => ipcRenderer.invoke('app:version'),
});

// Expose file system and path management methods
contextBridge.exposeInMainWorld('fileSystem', {
  // Path utilities
  normalizeToUnix: (path: string) => ipcRenderer.invoke('fs:normalizeToUnix', path),
  joinPaths: (path1: string, path2: string) => ipcRenderer.invoke('fs:joinPaths', path1, path2),
  getBaseName: (path: string) => ipcRenderer.invoke('fs:getBaseName', path),
  openFolder: () => ipcRenderer.invoke('fs:openFolder'),
  readDirectory: (path: string, applyIgnores?: boolean) => ipcRenderer.invoke('fs:readDirectory', path, applyIgnores),
  isDirectory: (path: string) => ipcRenderer.invoke('fs:isDirectory', path),
  getCurrentDirectory: () => ipcRenderer.invoke('fs:getCurrentDirectory'),
  getResourcesPath: () => ipcRenderer.invoke('fs:getResourcesPath'),
  getPromptTemplatePath: (templateName: string) =>
    ipcRenderer.invoke('fs:getPromptTemplatePath', templateName),
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
  getMaterialsDir: () => ipcRenderer.invoke('fs:getMaterialsDir'),
  relativeToProject: (filePath: string) => ipcRenderer.invoke('fs:relativeToProject', filePath),
});
