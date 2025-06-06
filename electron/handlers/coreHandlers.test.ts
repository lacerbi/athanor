// AI Summary: Comprehensive unit tests for coreHandlers IPC setup covering all 15 handlers
// with extensive mocking of electron modules, FileService, and mainWindow dependencies.

// Variables used in mock factories must be defined before jest.mock calls and before actual imports
// that might trigger those factories.
const mockWebContents = {
  send: jest.fn(),
  isDestroyed: jest.fn(),
};

const mockMainWindowObject = {
  webContents: mockWebContents,
};

// Mock electron modules
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
  },
  dialog: {
    showMessageBox: jest.fn(),
    showOpenDialog: jest.fn(),
  },
  app: {
    getVersion: jest.fn(),
    getPath: jest.fn(),
  },
  nativeTheme: {
    get shouldUseDarkColors() {
      return false; // Default mock value, will be overridden in tests
    },
  },
  shell: {
    openExternal: jest.fn(),
    openPath: jest.fn(),
  },
}));

// Mock windowManager - mockMainWindowObject is now defined and initialized.
jest.mock('../windowManager', () => ({
  mainWindow: mockMainWindowObject,
}));

// Mock FileService
jest.mock('../services/FileService');

// Create a single, persistent mock function instance for fs.promises.access
const persistentMockFsAccess = jest.fn();

// Mock fs.promises.access (used inline in coreHandlers)
jest.mock('fs', () => ({
  promises: {
    access: persistentMockFsAccess, // Use the persistent instance
  },
  constants: {
    R_OK: 4,
    W_OK: 2,
  },
}));

// Actual imports AFTER mocks and variable definitions for mock factories
import { setupCoreHandlers } from './coreHandlers';
import { FileService } from '../services/FileService'; // Type import or relies on prior mock
import { SettingsService } from '../services/SettingsService';
import { CUSTOM_TEMPLATES } from '../../src/utils/constants';

// Import mocked modules (these will be the mocked versions)
import { ipcMain, dialog, app, nativeTheme, shell } from 'electron';
import { mainWindow } from '../windowManager';
import * as fs from 'fs';

// Type the mocked modules
const mockIpcMain = ipcMain as jest.Mocked<typeof ipcMain>;
const mockDialog = dialog as jest.Mocked<typeof dialog>;
const mockApp = app as jest.Mocked<typeof app>;
const mockNativeTheme = nativeTheme as jest.Mocked<typeof nativeTheme>;
const mockShell = shell as jest.Mocked<typeof shell>;
// Ensure mockFsAccess uses the persistent instance
const mockFsAccess = persistentMockFsAccess as jest.MockedFunction<typeof fs.promises.access>;

describe('setupCoreHandlers', () => {
  let mockFileService: jest.Mocked<FileService>;
  let mockSettingsService: jest.Mocked<SettingsService>;
  let ipcHandlers: Map<string, Function>;
  let mockEvent: any;
  let originalConsoleError: typeof console.error;

  beforeAll(() => {
    // Mock console.error globally to avoid cluttering test output
    originalConsoleError = console.error;
    console.error = jest.fn();
  });

  afterAll(() => {
    // Restore original console.error
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Initialize IPC handlers map
    ipcHandlers = new Map();

    // Mock ipcMain.handle to capture handlers
    mockIpcMain.handle.mockImplementation((channel: string, handler: Function) => {
      ipcHandlers.set(channel, handler);
    });

    // Create mock FileService with all required methods
    mockFileService = {
      exists: jest.fn(),
      getBaseDir: jest.fn(),
      toUnix: jest.fn(),
      toOS: jest.fn(),
      join: jest.fn(),
      basename: jest.fn(),
      resolve: jest.fn(),
      relativize: jest.fn(),
      reloadIgnoreRules: jest.fn(),
      addToIgnore: jest.fn(),
      isDirectory: jest.fn(),
      getMaterialsDir: jest.fn(),
      setBaseDir: jest.fn(),
    } as any;

    // Create mock SettingsService
    mockSettingsService = {
      getApplicationSettings: jest.fn(),
      saveApplicationSettings: jest.fn(),
      getProjectSettings: jest.fn(),
      saveProjectSettings: jest.fn(),
    } as any;

    // Set up default mainWindow mock
    mockWebContents.send.mockClear();
    mockWebContents.isDestroyed.mockReturnValue(false);

    // Mock event object
    mockEvent = {};

    // Setup handlers
    setupCoreHandlers(mockFileService, mockSettingsService);
  });

  describe('handler registration', () => {
    it('should register all expected IPC handlers', () => {
      const expectedChannels = [
        'dialog:show-confirm-dialog',
        'fs:fileExists',
        'app:version',
        'app:get-user-data-path',
        'get-initial-dark-mode',
        'fs:getCurrentDirectory',
        'fs:normalizeToUnix',
        'fs:joinPaths',
        'fs:getBaseName',
        'fs:toOSPath',
        'fs:reloadIgnoreRules',
        'fs:addToIgnore',
        'fs:openFolder',
        'fs:setBaseDirectory',
        'fs:isDirectory',
        'fs:getMaterialsDir',
        'fs:relativeToProject',
        'fs:selectProjectInfoFile',
        'shell:openExternal',
        'shell:openPath',
        'app:getGlobalPromptsPath',
        'app:getProjectPromptsPath',
        'app:get-initial-path',
      ];

      expectedChannels.forEach(channel => {
        expect(ipcHandlers.has(channel)).toBe(true);
      });

      expect(mockIpcMain.handle).toHaveBeenCalledTimes(expectedChannels.length);
    });
  });

  describe('dialog:show-confirm-dialog handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = ipcHandlers.get('dialog:show-confirm-dialog')!;
    });

    it('should show confirmation dialog with mainWindow and return true for OK', async () => {
      mockDialog.showMessageBox.mockResolvedValue({ 
        response: 0, 
        checkboxChecked: false 
      });

      const result = await handler(mockEvent, 'Test message', 'Test title');

      expect(result).toBe(true);
      expect(mockDialog.showMessageBox).toHaveBeenCalledWith(mainWindow, {
        type: 'question',
        buttons: ['OK', 'Cancel'],
        defaultId: 0,
        cancelId: 1,
        message: 'Test message',
        title: 'Test title',
      });
    });

    it('should return false for Cancel', async () => {
      mockDialog.showMessageBox.mockResolvedValue({ 
        response: 1, 
        checkboxChecked: false 
      });

      const result = await handler(mockEvent, 'Test message');

      expect(result).toBe(false);
      expect(mockDialog.showMessageBox).toHaveBeenCalledWith(mainWindow, {
        type: 'question',
        buttons: ['OK', 'Cancel'],
        defaultId: 0,
        cancelId: 1,
        message: 'Test message',
        title: 'Confirmation',
      });
    });

    it('should handle null mainWindow gracefully', async () => {
      jest.resetModules(); // Reset module cache to allow fresh mocks for this test

      // Define local mocks for this specific test context
      const localMockDialog = { showMessageBox: jest.fn() };
      const localMockIpcMain = { handle: jest.fn() };
      const localMockSettingsService = {
        getApplicationSettings: jest.fn(),
        saveApplicationSettings: jest.fn(),
        getProjectSettings: jest.fn(),
        saveProjectSettings: jest.fn(),
      };

      jest.doMock('electron', () => ({
        ipcMain: localMockIpcMain,
        dialog: localMockDialog,
        app: { getVersion: jest.fn() }, // Stub 'app' as it's part of the original electron mock structure
      }));
      jest.doMock('../windowManager', () => ({
        mainWindow: null, // Crucial: Ensure mainWindow is null in this context
      }));

      // Re-require coreHandlers to get it with the new mocks, and re-setup its handlers
      const { setupCoreHandlers: localSetupCoreHandlers } = require('./coreHandlers');
      const localIpcHandlers = new Map<string, Function>();
      localMockIpcMain.handle.mockImplementation((channel: string, handlerFn: Function) => {
        localIpcHandlers.set(channel, handlerFn);
      });

      localSetupCoreHandlers(mockFileService, localMockSettingsService);
      const handlerForNullWindowTest = localIpcHandlers.get('dialog:show-confirm-dialog')!;
      
      localMockDialog.showMessageBox.mockResolvedValue({ 
        response: 0, 
        checkboxChecked: false 
      });

      const result = await handlerForNullWindowTest(mockEvent, 'Test message');

      expect(result).toBe(true);
      expect(localMockDialog.showMessageBox).toHaveBeenCalledWith({ // Assert options only
        type: 'question',
        buttons: ['OK', 'Cancel'],
        defaultId: 0,
        cancelId: 1,
        message: 'Test message',
        title: 'Confirmation',
      });
    });

    it('should return false on error', async () => {
      mockDialog.showMessageBox.mockRejectedValue(new Error('Dialog error'));

      // The handler's catch block calls handleError, which throws.
      // Thus, the promise returned by the handler will be rejected.
      await expect(handler(mockEvent, 'Test message')).rejects.toThrow('Dialog error');
    });
  });

  describe('fs:fileExists handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = ipcHandlers.get('fs:fileExists')!;
    });

    it('should return true when file exists', async () => {
      mockFileService.exists.mockResolvedValue(true);

      const result = await handler(mockEvent, '/test/path');

      expect(result).toBe(true);
      expect(mockFileService.exists).toHaveBeenCalledWith('/test/path');
    });

    it('should return false when file does not exist', async () => {
      mockFileService.exists.mockResolvedValue(false);

      const result = await handler(mockEvent, '/test/path');

      expect(result).toBe(false);
      expect(mockFileService.exists).toHaveBeenCalledWith('/test/path');
    });

    it('should handle service errors', async () => {
      mockFileService.exists.mockRejectedValue(new Error('Service error'));

      await expect(handler(mockEvent, '/test/path')).rejects.toThrow('Service error');
    });
  });

  describe('app:version handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = ipcHandlers.get('app:version')!;
    });

    it('should return app version', async () => {
      mockApp.getVersion.mockReturnValue('1.0.0');

      const result = await handler(mockEvent);

      expect(result).toBe('1.0.0');
      expect(mockApp.getVersion).toHaveBeenCalled();
    });

    it('should handle app.getVersion errors', () => { // No longer async
      mockApp.getVersion.mockImplementation(() => {
        throw new Error('Version error');
      });

      expect(() => handler(mockEvent)).toThrow('Version error');
    });
  });

  describe('app:get-user-data-path handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = ipcHandlers.get('app:get-user-data-path')!;
    });

    it('should return app user data path', () => {
      mockApp.getPath.mockReturnValue('/fake/user/data/path');

      const result = handler(mockEvent);

      expect(result).toBe('/fake/user/data/path');
      expect(mockApp.getPath).toHaveBeenCalledWith('userData');
    });

    it('should handle app.getPath errors', () => {
      mockApp.getPath.mockImplementation(() => {
        throw new Error('UserDataPath error');
      });

      expect(() => handler(mockEvent)).toThrow('UserDataPath error');
    });
  });

  describe('fs:getCurrentDirectory handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = ipcHandlers.get('fs:getCurrentDirectory')!;
    });

    it('should return current directory', () => { // No longer necessarily async if handler is sync
      mockFileService.getBaseDir.mockReturnValue('/current/dir');

      const result = handler(mockEvent); // Call synchronously

      expect(result).toBe('/current/dir');
      expect(mockFileService.getBaseDir).toHaveBeenCalled();
    });

    it('should handle service errors', () => { // No longer async
      mockFileService.getBaseDir.mockImplementation(() => {
        throw new Error('Directory error');
      });

      expect(() => handler(mockEvent)).toThrow('Directory error');
    });
  });

  describe('fs:normalizeToUnix handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = ipcHandlers.get('fs:normalizeToUnix')!;
    });

    it('should normalize path to Unix format', async () => {
      mockFileService.toUnix.mockReturnValue('/unix/path');

      const result = await handler(mockEvent, 'C:\\windows\\path');

      expect(result).toBe('/unix/path');
      expect(mockFileService.toUnix).toHaveBeenCalledWith('C:\\windows\\path');
    });

    it('should handle service errors', async () => {
      mockFileService.toUnix.mockImplementation(() => {
        throw new Error('Normalize error');
      });

      await expect(handler(mockEvent, 'invalid\\path')).rejects.toThrow('Normalize error');
    });
  });

  describe('fs:joinPaths handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = ipcHandlers.get('fs:joinPaths')!;
    });

    it('should join two paths', async () => {
      mockFileService.join.mockReturnValue('/joined/path');

      const result = await handler(mockEvent, '/base', 'sub');

      expect(result).toBe('/joined/path');
      expect(mockFileService.join).toHaveBeenCalledWith('/base', 'sub');
    });

    it('should handle service errors', async () => {
      mockFileService.join.mockImplementation(() => {
        throw new Error('Join error');
      });

      await expect(handler(mockEvent, '/base', 'sub')).rejects.toThrow('Join error');
    });
  });

  describe('fs:getBaseName handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = ipcHandlers.get('fs:getBaseName')!;
    });

    it('should return base name of path', async () => {
      mockFileService.basename.mockReturnValue('filename.txt');

      const result = await handler(mockEvent, '/path/to/filename.txt');

      expect(result).toBe('filename.txt');
      expect(mockFileService.basename).toHaveBeenCalledWith('/path/to/filename.txt');
    });

    it('should handle service errors', async () => {
      mockFileService.basename.mockImplementation(() => {
        throw new Error('Basename error');
      });

      await expect(handler(mockEvent, '/invalid/path')).rejects.toThrow('Basename error');
    });
  });

  describe('fs:toOSPath handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = ipcHandlers.get('fs:toOSPath')!;
    });

    it('should convert absolute path to OS format', async () => {
      mockFileService.toUnix.mockReturnValue('/absolute/path');
      mockFileService.toOS.mockReturnValue('C:\\absolute\\path');

      const result = await handler(mockEvent, '/absolute/path');

      expect(result).toBe('C:\\absolute\\path');
      expect(mockFileService.toUnix).toHaveBeenCalledWith('/absolute/path');
      expect(mockFileService.toOS).toHaveBeenCalledWith('/absolute/path');
    });

    it('should resolve relative path then convert to OS format', async () => {
      mockFileService.toUnix.mockReturnValue('relative/path');
      mockFileService.resolve.mockReturnValue('/resolved/path');
      mockFileService.toOS.mockReturnValue('C:\\resolved\\path');

      const result = await handler(mockEvent, 'relative/path');

      expect(result).toBe('C:\\resolved\\path');
      expect(mockFileService.toUnix).toHaveBeenCalledWith('relative/path');
      expect(mockFileService.resolve).toHaveBeenCalledWith('relative/path');
      expect(mockFileService.toOS).toHaveBeenCalledWith('/resolved/path');
    });

    it('should handle service errors', async () => {
      mockFileService.toUnix.mockImplementation(() => {
        throw new Error('Path conversion error');
      });

      await expect(handler(mockEvent, 'invalid\\path')).rejects.toThrow('Path conversion error');
    });
  });

  describe('fs:reloadIgnoreRules handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = ipcHandlers.get('fs:reloadIgnoreRules')!;
    });

    it('should reload ignore rules successfully', async () => {
      mockFileService.reloadIgnoreRules.mockResolvedValue(undefined);

      const result = await handler(mockEvent);

      expect(result).toBe(true);
      expect(mockFileService.reloadIgnoreRules).toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockFileService.reloadIgnoreRules.mockRejectedValue(new Error('Reload error'));

      await expect(handler(mockEvent)).rejects.toThrow('Reload error');
    });
  });

  describe('fs:addToIgnore handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = ipcHandlers.get('fs:addToIgnore')!;
    });

    it('should add item to ignore with default ignoreAll=false', async () => {
      mockFileService.addToIgnore.mockResolvedValue(true);

      const result = await handler(mockEvent, '/test/path');

      expect(result).toBe(true);
      expect(mockFileService.addToIgnore).toHaveBeenCalledWith('/test/path', false);
    });

    it('should add item to ignore with ignoreAll=true', async () => {
      mockFileService.addToIgnore.mockResolvedValue(true);

      const result = await handler(mockEvent, '/test/path', true);

      expect(result).toBe(true);
      expect(mockFileService.addToIgnore).toHaveBeenCalledWith('/test/path', true);
    });

    it('should handle undefined ignoreAll parameter', async () => {
      mockFileService.addToIgnore.mockResolvedValue(true);

      const result = await handler(mockEvent, '/test/path', undefined);

      expect(result).toBe(true);
      expect(mockFileService.addToIgnore).toHaveBeenCalledWith('/test/path', false);
    });

    it('should handle service errors', async () => {
      mockFileService.addToIgnore.mockRejectedValue(new Error('Add to ignore error'));

      await expect(handler(mockEvent, '/test/path')).rejects.toThrow('Add to ignore error');
    });
  });

  describe('fs:openFolder handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = ipcHandlers.get('fs:openFolder')!;
    });

    it('should return null when dialog is canceled', async () => {
      mockDialog.showOpenDialog.mockResolvedValue({ 
        canceled: true, 
        filePaths: [] 
      });

      const result = await handler(mockEvent);

      expect(result).toBeNull();
      expect(mockDialog.showOpenDialog).toHaveBeenCalledWith(mainWindow, {
        properties: ['openDirectory'],
      });
    });

    it('should successfully open folder', async () => {
      const selectedPath = '/selected/folder';
      const unixPath = '/unix/selected/folder';
      const platformPath = 'C:\\selected\\folder';

      mockDialog.showOpenDialog.mockResolvedValue({ 
        canceled: false, 
        filePaths: [selectedPath] 
      });
      mockFileService.toUnix.mockReturnValue(unixPath);
      mockFileService.toOS.mockReturnValue(platformPath);
      mockFsAccess.mockResolvedValue(undefined);
      mockFileService.setBaseDir.mockResolvedValue(undefined);

      const result = await handler(mockEvent);

      expect(result).toBe(unixPath);
      expect(mockFileService.toUnix).toHaveBeenCalledWith(selectedPath);
      expect(mockFileService.toOS).toHaveBeenCalledWith(unixPath);
      expect(mockFsAccess).toHaveBeenCalledWith(
        platformPath,
        fs.constants.R_OK | fs.constants.W_OK
      );
      expect(mockFileService.setBaseDir).toHaveBeenCalledWith(unixPath);
      expect(mockWebContents.send).toHaveBeenCalledWith('fs:folderChanged', unixPath);
    });

    it('should handle folder access error', async () => {
      const selectedPath = '/selected/folder';
      const unixPath = '/unix/selected/folder';
      const platformPath = 'C:\\selected\\folder';

      mockDialog.showOpenDialog.mockResolvedValue({ 
        canceled: false, 
        filePaths: [selectedPath] 
      });
      mockFileService.toUnix.mockReturnValue(unixPath);
      mockFileService.toOS.mockReturnValue(platformPath);
      mockFsAccess.mockRejectedValue(new Error('Permission denied'));

      await expect(handler(mockEvent)).rejects.toThrow('Cannot access folder: Permission denied');
      expect(mockWebContents.send).toHaveBeenCalledWith('fs:error', expect.stringContaining('Cannot access folder'));
    });

    it('should handle setBaseDir error', async () => {
      const selectedPath = '/selected/folder';
      const unixPath = '/unix/selected/folder';
      const platformPath = 'C:\\selected\\folder';

      mockDialog.showOpenDialog.mockResolvedValue({ 
        canceled: false, 
        filePaths: [selectedPath] 
      });
      mockFileService.toUnix.mockReturnValue(unixPath);
      mockFileService.toOS.mockReturnValue(platformPath);
      mockFsAccess.mockResolvedValue(undefined);
      mockFileService.setBaseDir.mockRejectedValue(new Error('SetBaseDir error'));

      await expect(handler(mockEvent)).rejects.toThrow('SetBaseDir error');
      // String(error) will produce "Error: SetBaseDir error"
      expect(mockWebContents.send).toHaveBeenCalledWith('fs:error', 'Error: SetBaseDir error');
    });

    it('should handle destroyed webContents gracefully', async () => {
      const selectedPath = '/selected/folder';
      const unixPath = '/unix/selected/folder';

      mockDialog.showOpenDialog.mockResolvedValue({ 
        canceled: false, 
        filePaths: [selectedPath] 
      });
      mockFileService.toUnix.mockReturnValue(unixPath);
      mockFileService.toOS.mockReturnValue('C:\\selected\\folder');
      mockFsAccess.mockResolvedValue(undefined);
      mockFileService.setBaseDir.mockResolvedValue(undefined);
      mockWebContents.isDestroyed.mockReturnValue(true);

      const result = await handler(mockEvent);

      expect(result).toBe(unixPath);
      expect(mockWebContents.send).not.toHaveBeenCalled();
    });
  });

  describe('fs:setBaseDirectory handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = ipcHandlers.get('fs:setBaseDirectory')!;
    });

    it('should call fileService.setBaseDir with the correct path', async () => {
      mockFileService.setBaseDir.mockResolvedValue(undefined);

      await handler(mockEvent, '/test/dir');

      expect(mockFileService.setBaseDir).toHaveBeenCalledWith('/test/dir');
    });

    it('should handle service errors', async () => {
      const errorMessage = 'Failed to set base directory';
      mockFileService.setBaseDir.mockRejectedValue(new Error(errorMessage));

      await expect(handler(mockEvent, '/test/dir')).rejects.toThrow(errorMessage);
    });
  });

  describe('fs:isDirectory handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = ipcHandlers.get('fs:isDirectory')!;
    });

    it('should return true for directory', async () => {
      mockFileService.isDirectory.mockResolvedValue(true);

      const result = await handler(mockEvent, '/test/dir');

      expect(result).toBe(true);
      expect(mockFileService.isDirectory).toHaveBeenCalledWith('/test/dir');
    });

    it('should return false for file', async () => {
      mockFileService.isDirectory.mockResolvedValue(false);

      const result = await handler(mockEvent, '/test/file.txt');

      expect(result).toBe(false);
      expect(mockFileService.isDirectory).toHaveBeenCalledWith('/test/file.txt');
    });

    it('should handle service errors', async () => {
      mockFileService.isDirectory.mockRejectedValue(new Error('Directory check error'));

      await expect(handler(mockEvent, '/test/path')).rejects.toThrow('Directory check error');
    });
  });

  describe('fs:getMaterialsDir handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = ipcHandlers.get('fs:getMaterialsDir')!;
    });

    it('should return materials directory path', async () => {
      mockFileService.getMaterialsDir.mockReturnValue('/project/.ath_materials');

      const result = await handler(mockEvent);

      expect(result).toBe('/project/.ath_materials');
      expect(mockFileService.getMaterialsDir).toHaveBeenCalled();
    });

    it('should handle service errors', () => { // No longer async
      mockFileService.getMaterialsDir.mockImplementation(() => {
        throw new Error('Materials dir error');
      });

      expect(() => handler(mockEvent)).toThrow('Materials dir error');
    });
  });

  describe('fs:relativeToProject handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = ipcHandlers.get('fs:relativeToProject')!;
    });

    it('should return project-relative path', async () => {
      mockFileService.toUnix.mockReturnValue('/absolute/path');
      mockFileService.relativize.mockReturnValue('relative/path');

      const result = await handler(mockEvent, '/absolute/path');

      expect(result).toBe('relative/path');
      expect(mockFileService.toUnix).toHaveBeenCalledWith('/absolute/path');
      expect(mockFileService.relativize).toHaveBeenCalledWith('/absolute/path');
    });

    it('should handle service errors', async () => { // This handler is async, so .rejects.toThrow is correct
      mockFileService.toUnix.mockImplementation(() => {
        throw new Error('Path conversion error');
      });

      await expect(handler(mockEvent, '/invalid/path')).rejects.toThrow('Path conversion error');
    });
  });

  describe('fs:selectProjectInfoFile handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = ipcHandlers.get('fs:selectProjectInfoFile')!;
    });

    it('should return null when no project is open', async () => {
      mockFileService.getBaseDir.mockReturnValue('');

      await expect(handler(mockEvent)).rejects.toThrow('No project is currently open');
    });

    it('should return null when dialog is canceled', async () => {
      mockFileService.getBaseDir.mockReturnValue('/project');
      mockFileService.toOS.mockReturnValue('C:\\project');
      mockDialog.showOpenDialog.mockResolvedValue({ 
        canceled: true, 
        filePaths: [] 
      });

      const result = await handler(mockEvent);

      expect(result).toBeNull();
      expect(mockDialog.showOpenDialog).toHaveBeenCalledWith(mainWindow, {
        title: 'Select Project Information File',
        defaultPath: 'C:\\project',
        properties: ['openFile'],
        filters: [
          { name: 'Text Files', extensions: ['md', 'txt', 'log', 'json', 'xml', 'yaml', 'yml', 'ini', 'rst', 'adoc'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
    });

    it('should successfully select project info file', async () => {
      const baseDir = '/project';
      const selectedFile = '/project/README.md';
      const relativePath = 'README.md';

      mockFileService.getBaseDir.mockReturnValue(baseDir);
      mockFileService.toOS.mockReturnValue('C:\\project');
      mockDialog.showOpenDialog.mockResolvedValue({ 
        canceled: false, 
        filePaths: [selectedFile] 
      });
      mockFileService.toUnix.mockReturnValue(selectedFile);
      mockFileService.relativize.mockReturnValue(relativePath);

      const result = await handler(mockEvent);

      expect(result).toBe(relativePath);
      expect(mockFileService.toUnix).toHaveBeenCalledWith(selectedFile);
      expect(mockFileService.relativize).toHaveBeenCalledWith(selectedFile);
    });

    it('should reject file outside project directory', async () => {
      const baseDir = '/project';
      const selectedFile = '/outside/file.md';
      const relativePath = '../outside/file.md';

      mockFileService.getBaseDir.mockReturnValue(baseDir);
      mockFileService.toOS.mockReturnValue('C:\\project');
      mockDialog.showOpenDialog.mockResolvedValue({ 
        canceled: false, 
        filePaths: [selectedFile] 
      });
      mockFileService.toUnix.mockReturnValue(selectedFile);
      mockFileService.relativize.mockReturnValue(relativePath);

      await expect(handler(mockEvent)).rejects.toThrow('Selected file must be within the project directory');
    });

    it('should reject absolute path file', async () => {
      const baseDir = '/project';
      const selectedFile = '/absolute/file.md';
      const relativePath = '/absolute/file.md'; // Returns the same absolute path

      mockFileService.getBaseDir.mockReturnValue(baseDir);
      mockFileService.toOS.mockReturnValue('C:\\project');
      mockDialog.showOpenDialog.mockResolvedValue({ 
        canceled: false, 
        filePaths: [selectedFile] 
      });
      mockFileService.toUnix.mockReturnValue(selectedFile);
      mockFileService.relativize.mockReturnValue(relativePath);

      await expect(handler(mockEvent)).rejects.toThrow('Selected file must be within the project directory');
    });

    it('should handle service errors', async () => {
      mockFileService.getBaseDir.mockReturnValue('/project');
      mockFileService.toOS.mockImplementation(() => {
        throw new Error('Path conversion error');
      });

      await expect(handler(mockEvent)).rejects.toThrow('Path conversion error');
    });
  });

  describe('get-initial-dark-mode handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = ipcHandlers.get('get-initial-dark-mode')!;
    });

    it('should return true when nativeTheme.shouldUseDarkColors is true', () => {
      // Mock the getter to return true
      Object.defineProperty(mockNativeTheme, 'shouldUseDarkColors', {
        get: jest.fn(() => true),
        configurable: true,
      });

      const result = handler(mockEvent); // This handler is synchronous

      expect(result).toBe(true);
    });

    it('should return false when nativeTheme.shouldUseDarkColors is false', () => {
      // Mock the getter to return false
      Object.defineProperty(mockNativeTheme, 'shouldUseDarkColors', {
        get: jest.fn(() => false),
        configurable: true,
      });

      const result = handler(mockEvent);

      expect(result).toBe(false);
    });

    it('should handle errors when nativeTheme.shouldUseDarkColors throws', () => {
      // Mock the getter to throw an error
      Object.defineProperty(mockNativeTheme, 'shouldUseDarkColors', {
        get: jest.fn(() => {
          throw new Error('NativeTheme error');
        }),
        configurable: true,
      });
      
      // The handler in coreHandlers.ts catches the error and re-throws it via handleError.
      expect(() => handler(mockEvent)).toThrow('NativeTheme error');
    });
  });

  describe('shell:openExternal handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = ipcHandlers.get('shell:openExternal')!;
    });

    it('should call shell.openExternal with the provided URL', async () => {
      mockShell.openExternal.mockResolvedValue(undefined);
      const testUrl = 'https://example.com';

      await handler(mockEvent, testUrl);

      expect(mockShell.openExternal).toHaveBeenCalledWith(testUrl);
    });

    it('should handle errors if shell.openExternal rejects', async () => {
      mockShell.openExternal.mockRejectedValue(new Error('Open external error'));
      const testUrl = 'https://example.com';

      // The handler catches the error and re-throws it via handleError
      await expect(handler(mockEvent, testUrl)).rejects.toThrow('Open external error');
    });
  });

  describe('shell:openPath handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = ipcHandlers.get('shell:openPath')!;
    });

    it('should call shell.openPath with the provided path', async () => {
      mockShell.openPath.mockResolvedValue(''); // openPath resolves with an empty string on success or an error message on failure
      const testPath = '/fake/path/to/file';

      await handler(mockEvent, testPath);

      expect(mockShell.openPath).toHaveBeenCalledWith(testPath);
    });

    it('should handle errors if shell.openPath rejects', async () => {
      mockShell.openPath.mockRejectedValue(new Error('Open path error'));
      const testPath = '/fake/path/to/file';

      await expect(handler(mockEvent, testPath)).rejects.toThrow('Open path error');
    });
  });

  describe('app:getGlobalPromptsPath handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = ipcHandlers.get('app:getGlobalPromptsPath')!;
    });

    it('should return the correct global prompts path', () => {
      const mockUserDataPath = '/fake/user/data/path';
      const mockUnixUserDataPath = '/fake/user/data/path'; // Assuming toUnix behavior
      const expectedPath = `/fake/user/data/path/${CUSTOM_TEMPLATES.USER_PROMPTS_DIR_NAME}`;

      mockApp.getPath.mockReturnValue(mockUserDataPath);
      mockFileService.toUnix.mockReturnValue(mockUnixUserDataPath);
      mockFileService.join.mockReturnValue(expectedPath);

      const result = handler(mockEvent);

      expect(mockApp.getPath).toHaveBeenCalledWith('userData');
      expect(mockFileService.toUnix).toHaveBeenCalledWith(mockUserDataPath);
      expect(mockFileService.join).toHaveBeenCalledWith(mockUnixUserDataPath, CUSTOM_TEMPLATES.USER_PROMPTS_DIR_NAME);
      expect(result).toBe(expectedPath);
    });

    it('should handle errors from app.getPath', () => {
      mockApp.getPath.mockImplementation(() => {
        throw new Error('GetPath error');
      });

      expect(() => handler(mockEvent)).toThrow('GetPath error');
    });

    it('should handle errors from fileService.toUnix', () => {
      mockApp.getPath.mockReturnValue('/fake/user/data/path');
      mockFileService.toUnix.mockImplementation(() => {
        throw new Error('toUnix error');
      });

      expect(() => handler(mockEvent)).toThrow('toUnix error');
    });
    
    it('should handle errors from fileService.join', () => {
      mockApp.getPath.mockReturnValue('/fake/user/data/path');
      mockFileService.toUnix.mockReturnValue('/fake/user/data/path');
      mockFileService.join.mockImplementation(() => {
        throw new Error('join error');
      });

      expect(() => handler(mockEvent)).toThrow('join error');
    });
  });

  describe('app:getProjectPromptsPath handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = ipcHandlers.get('app:getProjectPromptsPath')!;
    });

    it('should return the correct project prompts path', () => {
      const mockMaterialsDir = '/current/project/.ath_materials';
      const expectedPath = `/current/project/.ath_materials/${CUSTOM_TEMPLATES.USER_PROMPTS_DIR_NAME}`;
      
      mockFileService.getMaterialsDir.mockReturnValue(mockMaterialsDir);
      mockFileService.join.mockReturnValue(expectedPath);

      const result = handler(mockEvent);

      expect(mockFileService.getMaterialsDir).toHaveBeenCalled();
      expect(mockFileService.join).toHaveBeenCalledWith(mockMaterialsDir, CUSTOM_TEMPLATES.USER_PROMPTS_DIR_NAME);
      expect(result).toBe(expectedPath);
    });

    it('should handle errors from fileService.getMaterialsDir', () => {
      mockFileService.getMaterialsDir.mockImplementation(() => {
        throw new Error('GetMaterialsDir error');
      });

      expect(() => handler(mockEvent)).toThrow('GetMaterialsDir error');
    });

    it('should handle errors from fileService.join', () => {
      mockFileService.getMaterialsDir.mockReturnValue('/current/project/.ath_materials');
      mockFileService.join.mockImplementation(() => {
        throw new Error('join error');
      });

      expect(() => handler(mockEvent)).toThrow('join error');
    });
  });

  describe('app:get-initial-path handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = ipcHandlers.get('app:get-initial-path')!;
    });

    it('should return null when no application settings exist', async () => {
      mockSettingsService.getApplicationSettings.mockResolvedValue(null);

      const result = await handler(mockEvent);

      expect(result).toBeNull();
      expect(mockSettingsService.getApplicationSettings).toHaveBeenCalled();
    });

    it('should return null when no lastOpenedProjectPath in settings', async () => {
      mockSettingsService.getApplicationSettings.mockResolvedValue({
        enableExperimentalFeatures: false,
      });

      const result = await handler(mockEvent);

      expect(result).toBeNull();
    });

    it('should return null when lastOpenedProjectPath directory does not exist', async () => {
      mockSettingsService.getApplicationSettings.mockResolvedValue({
        lastOpenedProjectPath: '/nonexistent/path',
      });
      mockFileService.exists.mockResolvedValue(false);

      const result = await handler(mockEvent);

      expect(result).toBeNull();
      expect(mockFileService.exists).toHaveBeenCalledWith('/nonexistent/path');
    });

    it('should return null when lastOpenedProjectPath is not a directory', async () => {
      mockSettingsService.getApplicationSettings.mockResolvedValue({
        lastOpenedProjectPath: '/path/to/file.txt',
      });
      mockFileService.exists.mockResolvedValue(true);
      mockFileService.isDirectory.mockResolvedValue(false);

      const result = await handler(mockEvent);

      expect(result).toBeNull();
      expect(mockFileService.isDirectory).toHaveBeenCalledWith('/path/to/file.txt');
    });

    it('should return null when directory does not contain .athignore', async () => {
      const projectPath = '/valid/project';
      mockSettingsService.getApplicationSettings.mockResolvedValue({
        lastOpenedProjectPath: projectPath,
      });
      mockFileService.exists.mockImplementation((path) => {
        if (path === projectPath) return Promise.resolve(true);
        if (path === '/valid/project/.athignore') return Promise.resolve(false);
        return Promise.resolve(false);
      });
      mockFileService.isDirectory.mockResolvedValue(true);
      mockFileService.join.mockReturnValue('/valid/project/.athignore');

      const result = await handler(mockEvent);

      expect(result).toBeNull();
      expect(mockFileService.join).toHaveBeenCalledWith(projectPath, '.athignore');
    });

    it('should return valid project path when all checks pass', async () => {
      const projectPath = '/valid/project';
      mockSettingsService.getApplicationSettings.mockResolvedValue({
        lastOpenedProjectPath: projectPath,
      });
      mockFileService.exists.mockImplementation((path) => {
        if (path === projectPath) return Promise.resolve(true);
        if (path === '/valid/project/.athignore') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileService.isDirectory.mockResolvedValue(true);
      mockFileService.join.mockReturnValue('/valid/project/.athignore');

      const result = await handler(mockEvent);

      expect(result).toBe(projectPath);
      expect(mockSettingsService.getApplicationSettings).toHaveBeenCalled();
      expect(mockFileService.exists).toHaveBeenCalledWith(projectPath);
      expect(mockFileService.isDirectory).toHaveBeenCalledWith(projectPath);
      expect(mockFileService.join).toHaveBeenCalledWith(projectPath, '.athignore');
      expect(mockFileService.exists).toHaveBeenCalledWith('/valid/project/.athignore');
    });

    it('should return null and handle errors gracefully', async () => {
      mockSettingsService.getApplicationSettings.mockRejectedValue(new Error('Settings error'));

      const result = await handler(mockEvent);

      expect(result).toBeNull();
    });
  });
});
