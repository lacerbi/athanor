// AI Summary: Exposes protected methods for IPC communication and file system operations.
// Now includes FileService, PathUtils interfaces, and secure API key management.

import { contextBridge, ipcRenderer } from 'electron';
import { IPCChannelNames } from './modules/secure-api-storage/common/types';

// Channel name for confirmation dialog (must match coreHandlers.ts)
const SHOW_CONFIRM_DIALOG_CHANNEL = 'dialog:show-confirm-dialog';

// Expose protected methods for IPC communication
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

// Expose app info methods
contextBridge.exposeInMainWorld('app', {
  getVersion: () => ipcRenderer.invoke('app:version'),
});

// Expose settings service API
contextBridge.exposeInMainWorld('settingsService', {
  getProjectSettings: (projectPath: string) => 
    ipcRenderer.invoke('settings:get-project', projectPath),
  saveProjectSettings: (projectPath: string, settings: any) => 
    ipcRenderer.invoke('settings:save-project', projectPath, settings),
  getApplicationSettings: () => 
    ipcRenderer.invoke('settings:get-application'),
  saveApplicationSettings: (settings: any) => 
    ipcRenderer.invoke('settings:save-application', settings),
});

// Expose secure API key management
contextBridge.exposeInMainWorld('electronBridge', {
  secureApiKeyManager: {
    storeKey: (providerId: string, apiKey: string) => 
      ipcRenderer.invoke(IPCChannelNames.SECURE_API_KEY_STORE, { providerId, apiKey }),
    getKey: (providerId: string) => 
      ipcRenderer.invoke(IPCChannelNames.SECURE_API_KEY_GET, providerId),
    deleteKey: (providerId: string) => 
      ipcRenderer.invoke(IPCChannelNames.SECURE_API_KEY_DELETE, providerId),
    isKeyStored: (providerId: string) => 
      ipcRenderer.invoke(IPCChannelNames.SECURE_API_KEY_IS_STORED, providerId),
    getStoredProviderIds: () => 
      ipcRenderer.invoke(IPCChannelNames.SECURE_API_KEY_GET_STORED_PROVIDERS),
    getApiKeyDisplayInfo: (providerId: string) => 
      ipcRenderer.invoke(IPCChannelNames.SECURE_API_KEY_GET_DISPLAY_INFO, providerId),
  },
  ui: {
    confirm: (message: string, title?: string): Promise<boolean> =>
      ipcRenderer.invoke(SHOW_CONFIRM_DIALOG_CHANNEL, message, title),
  },
});

// Expose the new pathUtils API
contextBridge.exposeInMainWorld('pathUtils', {
  // Path utilities (pure functions)
  toUnix: (path: string) => ipcRenderer.invoke('fs:normalizeToUnix', path),
  join: (path1: string, path2: string) => ipcRenderer.invoke('fs:joinPaths', path1, path2),
  basename: (path: string) => ipcRenderer.invoke('fs:getBaseName', path),
  toOS: (path: string) => ipcRenderer.invoke('fs:toOSPath', path),
  relative: (path: string) => ipcRenderer.invoke('fs:relativeToProject', path),
});

// Expose the new fileService API
contextBridge.exposeInMainWorld('fileService', {
  // Path operations
  resolve: (relativePath: string) => ipcRenderer.invoke('fs:toOSPath', relativePath),
  relativize: (absolutePath: string) => ipcRenderer.invoke('fs:relativeToProject', absolutePath),
  
  // Directory operations
  getCurrentDirectory: () => ipcRenderer.invoke('fs:getCurrentDirectory'),
  isDirectory: (path: string) => ipcRenderer.invoke('fs:isDirectory', path),
  readDirectory: (path: string, applyIgnores?: boolean) => 
    ipcRenderer.invoke('fs:readDirectory', path, applyIgnores),
  ensureDirectory: (path: string) => ipcRenderer.invoke('fs:ensureDirectory', path),
  
  // File operations
  exists: (path: string) => ipcRenderer.invoke('fs:fileExists', path),
  read: (path: string, options?: { encoding?: BufferEncoding } | BufferEncoding) => 
    ipcRenderer.invoke('fs:readFile', path, options),
  write: (path: string, data: string) => ipcRenderer.invoke('fs:writeFile', path, data),
  remove: (path: string) => ipcRenderer.invoke('fs:deleteFile', path),
  
  // Watcher operations
  watch: async (path: string, callback: (event: string, filename: string) => void) => {
    ipcRenderer.removeAllListeners('fs:change');
    ipcRenderer.removeAllListeners('fs:error');

    ipcRenderer.on('fs:change', (_, event, filename) => callback(event, filename));
    ipcRenderer.on('fs:error', (_, error) => console.error('File system error:', error));

    return await ipcRenderer.invoke('fs:watch', path);
  },
  cleanupWatchers: () => ipcRenderer.invoke('fs:cleanupWatchers'),
  
  // Ignore operations
  reloadIgnoreRules: () => ipcRenderer.invoke('fs:reloadIgnoreRules'),
  addToIgnore: (itemPath: string, ignoreAll: boolean = false) =>
    ipcRenderer.invoke('fs:addToIgnore', itemPath, ignoreAll),
  
  // Application paths
  getMaterialsDir: () => ipcRenderer.invoke('fs:getMaterialsDir'),
  getResourcesPath: () => ipcRenderer.invoke('fs:getResourcesPath'),
  getPromptTemplatePath: (templateName: string) =>
    ipcRenderer.invoke('fs:getPromptTemplatePath', templateName),
  
  // Project operations
  openFolder: () => ipcRenderer.invoke('fs:openFolder'),
  selectProjectInfoFile: () => ipcRenderer.invoke('fs:selectProjectInfoFile'),
});

// Maintain legacy fileSystem API for backwards compatibility
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
  fileExists: (path: string) => ipcRenderer.invoke('fs:fileExists', path),
  writeFile: (path: string, data: string) =>
    ipcRenderer.invoke('fs:writeFile', path, data),
  deleteFile: (path: string) => ipcRenderer.invoke('fs:deleteFile', path),
  addToIgnore: (itemPath: string, ignoreAll: boolean = false) =>
    ipcRenderer.invoke('fs:addToIgnore', itemPath, ignoreAll),
  getMaterialsDir: () => ipcRenderer.invoke('fs:getMaterialsDir'),
  relativeToProject: (filePath: string) => ipcRenderer.invoke('fs:relativeToProject', filePath),
});
