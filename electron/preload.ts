// AI Summary: Exposes protected methods for IPC communication and file system operations.
// Now includes FileService, PathUtils interfaces, and secure API key management.

import { contextBridge, ipcRenderer } from 'electron';
import { IPCChannelNames } from './modules/secure-api-storage/common/types';

// Channel name for confirmation dialog (must match coreHandlers.ts)
const SHOW_CONFIRM_DIALOG_CHANNEL = 'dialog:show-confirm-dialog';

// Expose protected methods for IPC communication
contextBridge.exposeInMainWorld('electron', {
  send: (channel: string, data: any) => {
    const validChannels = ['toMain', 'app:rebuild-menu'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel: string, func: (...args: any[]) => void) => {
    const validChannels = ['fromMain', 'menu:open-folder', 'menu:open-path'];
    if (validChannels.includes(channel)) {
      const listener = (event: any, ...args: any[]) => func(...args);
      ipcRenderer.on(channel, listener);
      // Return a cleanup function to remove this specific listener
      return () => {
        ipcRenderer.removeListener(channel, listener);
      };
    }
    // Return a no-op function if the channel is invalid for safety
    return () => {};
  },
});

// Expose app info methods
contextBridge.exposeInMainWorld('app', {
  getVersion: () => ipcRenderer.invoke('app:version'),
  getUserDataPath: () => ipcRenderer.invoke('app:get-user-data-path'),
  getInitialPath: () => ipcRenderer.invoke('app:get-initial-path'),
});

// Expose native theme bridge for system theme detection
contextBridge.exposeInMainWorld('nativeThemeBridge', {
  getInitialDarkMode: () => ipcRenderer.invoke('get-initial-dark-mode'),
  onNativeThemeUpdated: (callback: (shouldUseDarkColors: boolean) => void) => {
    const channel = 'native-theme-updated';
    ipcRenderer.on(channel, (_event, shouldUseDarkColors: boolean) => callback(shouldUseDarkColors));
    // Return a cleanup function
    return () => {
      ipcRenderer.removeAllListeners(channel);
    };
  }
});

// WARNING: For renderer-side logic, always prefer using actions from the
// useSettingsStore over calling these IPC functions directly. This ensures the
// application's in-memory state remains synchronized with the file on disk.
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

// Import LLM service renderer
import { llmServiceRenderer } from './modules/llm/renderer/LLMServiceRenderer';

// Expose secure API key management and LLM service
contextBridge.exposeInMainWorld('electronBridge', {
  // WARNING: For renderer-side logic, always prefer using actions from the
  // relevant Zustand store over calling these IPC functions directly. This ensures the
  // application's in-memory state remains synchronized with the file on disk.
  secureApiKeyManager: {
    storeKey: (providerId: string, apiKey: string) => 
      ipcRenderer.invoke(IPCChannelNames.SECURE_API_KEY_STORE, { providerId, apiKey }),
    // getKey: REMOVED for security - plaintext keys should never be accessible to renderer
    deleteKey: (providerId: string) => 
      ipcRenderer.invoke(IPCChannelNames.SECURE_API_KEY_DELETE, providerId),
    isKeyStored: (providerId: string) => 
      ipcRenderer.invoke(IPCChannelNames.SECURE_API_KEY_IS_STORED, providerId),
    getStoredProviderIds: () => 
      ipcRenderer.invoke(IPCChannelNames.SECURE_API_KEY_GET_STORED_PROVIDERS),
    getApiKeyDisplayInfo: (providerId: string) => 
      ipcRenderer.invoke(IPCChannelNames.SECURE_API_KEY_GET_DISPLAY_INFO, providerId),
  },
  llmService: {
    getProviders: () => llmServiceRenderer.getProviders(),
    getModels: (providerId: string) => llmServiceRenderer.getModels(providerId as any),
    sendMessage: (request: any) => llmServiceRenderer.sendMessage(request),
  },
  appShell: {
    openExternalURL: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
    openPath: (path: string) => ipcRenderer.invoke('shell:openPath', path),
    getGlobalPromptsPath: () => ipcRenderer.invoke('app:getGlobalPromptsPath'),
    getProjectPromptsPath: () => ipcRenderer.invoke('app:getProjectPromptsPath'),
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
  
  // Base directory management
  setBaseDirectory: (path: string) => ipcRenderer.invoke('fs:setBaseDirectory', path),
  
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
