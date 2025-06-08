// AI Summary: Unit tests for FileService covering path resolution, file operations,
// watchers, and ignore rule handling with mocked file system interactions.

import { FileService } from './FileService';
import { PathUtils } from './PathUtils';
import * as fsPromises from 'fs/promises';
import { Stats } from 'fs';
import * as chokidar from 'chokidar';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('chokidar');
jest.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: jest.fn().mockReturnValue('/app/path')
  }
}));
jest.mock('../ignoreRulesManager', () => ({
  ignoreRulesManager: {
    setBaseDir: jest.fn(),
    clearRules: jest.fn(),
    loadIgnoreRules: jest.fn().mockResolvedValue(undefined),
    ignores: jest.fn().mockImplementation((path) => path.includes('node_modules'))
  }
}));

describe('FileService', () => {
  let fileService: FileService;
  let mockChokidarWatcher: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock chokidar watcher
    mockChokidarWatcher = {
      on: jest.fn().mockReturnThis(),
      close: jest.fn().mockResolvedValue(undefined)
    };
    (chokidar.watch as jest.Mock).mockReturnValue(mockChokidarWatcher);
    
    // Create FileService instance with initial baseDir
    fileService = new FileService();
    // Set baseDir explicitly for testing
    fileService['baseDir'] = '/test/dir';
  });

  afterEach(async () => {
    // Ensure any watchers created during a test are cleaned up
    await fileService.cleanupWatchers();
  });

  describe('Path Helpers', () => {
    test('toUnix delegates to PathUtils.normalizeToUnix', () => {
      const spy = jest.spyOn(PathUtils, 'normalizeToUnix');
      fileService.toUnix('path/to/file');
      expect(spy).toHaveBeenCalledWith('path/to/file');
    });

    test('toAbsolute handles absolute paths correctly', () => {
      // Use the private method directly for testing
      const result = (fileService as any).toAbsolute('/absolute/path/file.txt');
      expect(result).toBe('/absolute/path/file.txt');
    });

    test('toOS delegates to PathUtils.toPlatform', () => {
      const spy = jest.spyOn(PathUtils, 'toPlatform');
      fileService.toOS('path/to/file');
      expect(spy).toHaveBeenCalledWith('path/to/file');
    });

    test('resolve converts relative path to absolute', () => {
      const result = fileService.resolve('subdir/file.txt');
      expect(result).toBe('/test/dir/subdir/file.txt');
    });

    test('resolve handles absolute paths within baseDir', () => {
      const result = fileService.resolve('/test/dir/subdir/file.txt');
      expect(result).toBe('/test/dir/subdir/file.txt');
    });

    test('resolve throws error for path traversal attempts', () => {
      expect(() => fileService.resolve('../outside/file.txt')).toThrow();
      expect(() => fileService.resolve('/outside/dir/file.txt')).toThrow();
      // Valid relative path within project should not throw
      expect(() => fileService.resolve('subdir/file.txt')).not.toThrow();
      // Valid absolute path within project should not throw
      expect(() => fileService.resolve('/test/dir/subdir/file.txt')).not.toThrow();
    });

    test('relativize converts absolute path to project-relative', () => {
      const result = fileService.relativize('/test/dir/subdir/file.txt');
      expect(result).toBe('subdir/file.txt');
    });

    test('relativize handles root path', () => {
      const result = fileService.relativize('/test/dir');
      expect(result).toBe('.');
    });

    test('relativize warns for paths outside baseDir', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = fileService.relativize('/outside/dir/file.txt');
      expect(consoleSpy).toHaveBeenCalled();
      expect(result).toBe('/outside/dir/file.txt');
    });
  });

  describe('Base Directory Management', () => {
    test('setBaseDir updates base directory and reloads ignore rules', async () => {
      const cleanupSpy = jest.spyOn(fileService, 'cleanupWatchers').mockResolvedValue();
      
      await fileService.setBaseDir('/new/base/dir');
      
      expect(fileService.getBaseDir()).toBe('/new/base/dir');
      expect(cleanupSpy).toHaveBeenCalled();
    });

    test('getBaseDir returns current base directory', () => {
      expect(fileService.getBaseDir()).toBe('/test/dir');
    });

    test('getMaterialsDir returns materials directory path', () => {
      expect(fileService.getMaterialsDir()).toMatch(/\.ath_materials$/);
    });
  });

  describe('File Operations', () => {
    beforeEach(() => {
      // Setup fs.promises mocks
      (fsPromises.access as jest.Mock).mockResolvedValue(undefined);
      (fsPromises.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false
      } as unknown as Stats);
      (fsPromises.readFile as jest.Mock).mockResolvedValue('file content');
      (fsPromises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fsPromises.unlink as jest.Mock).mockResolvedValue(undefined);
      (fsPromises.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fsPromises.readdir as jest.Mock).mockResolvedValue(['file1.txt', 'file2.txt', 'subdir']);
    });

    test('read reads file content', async () => {
      const result = await fileService.read('file.txt');
      
      expect(fsPromises.access).toHaveBeenCalled();
      expect(fsPromises.stat).toHaveBeenCalled();
      expect(fsPromises.readFile).toHaveBeenCalled();
      expect(result).toBe('file content');
    });

    test('read accepts absolute paths outside baseDir', async () => {
      const result = await fileService.read('/tmp/athanor-test.txt');
      
      expect(fsPromises.access).toHaveBeenCalled();
      expect(fsPromises.stat).toHaveBeenCalled();
      expect(fsPromises.readFile).toHaveBeenCalled();
      expect(result).toBe('file content');
    });

    test('read throws error for non-existent files', async () => {
      (fsPromises.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));
      
      await expect(fileService.read('non-existent.txt')).rejects.toThrow();
    });

    test('write writes data to file', async () => {
      await fileService.write('file.txt', 'new content');
      
      expect(fsPromises.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        'new content'
      );
    });

    test('write accepts absolute paths outside baseDir', async () => {
      await fileService.write('/tmp/athanor-test.txt', 'new content');
      
      expect(fsPromises.mkdir).toHaveBeenCalled();
      expect(fsPromises.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        'new content'
      );
    });

    test('write normalizes line endings', async () => {
      await fileService.write('file.txt', 'line1\r\nline2\r\nline3');
      
      expect(fsPromises.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        'line1\nline2\nline3'
      );
    });

    test('remove deletes a file', async () => {
      (fsPromises.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false
      } as unknown as Stats);
      
      await fileService.remove('file.txt');
      
      expect(fsPromises.unlink).toHaveBeenCalled();
    });

    test('remove throws error for non-existent files', async () => {
      (fsPromises.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));
      
      await expect(fileService.remove('non-existent.txt')).rejects.toThrow();
    });

    test('exists checks if file exists', async () => {
      const result = await fileService.exists('file.txt');
      expect(result).toBe(true);
      
      (fsPromises.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));
      const result2 = await fileService.exists('non-existent.txt');
      expect(result2).toBe(false);
    });

    test('exists works with absolute paths outside baseDir', async () => {
      const result = await fileService.exists('/tmp/athanor-test.txt');
      expect(result).toBe(true);
      
      (fsPromises.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));
      const result2 = await fileService.exists('/tmp/non-existent.txt');
      expect(result2).toBe(false);
    });

    test('stats gets file stats', async () => {
      const mockStats = {
        isFile: () => true,
        isDirectory: () => false
      } as unknown as Stats;
      (fsPromises.stat as jest.Mock).mockResolvedValue(mockStats);
      
      const result = await fileService.stats('file.txt');
      expect(result).toBe(mockStats);
      
      (fsPromises.stat as jest.Mock).mockRejectedValue(new Error('ENOENT'));
      const result2 = await fileService.stats('non-existent.txt');
      expect(result2).toBe(null);
    });

    test('isDirectory checks if path is directory', async () => {
      (fsPromises.stat as jest.Mock).mockResolvedValue({
        isFile: () => false,
        isDirectory: () => true
      } as unknown as Stats);
      
      const result = await fileService.isDirectory('dir');
      expect(result).toBe(true);
      
      (fsPromises.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false
      } as unknown as Stats);
      
      const result2 = await fileService.isDirectory('file.txt');
      expect(result2).toBe(false);
    });

    test('ensureDir creates directory recursively', async () => {
      await fileService.ensureDir('path/to/dir');
      
      expect(fsPromises.mkdir).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      );
    });

    test('ensureDir ignores EEXIST error', async () => {
      const error = new Error('Directory exists') as NodeJS.ErrnoException;
      error.code = 'EEXIST';
      (fsPromises.mkdir as jest.Mock).mockRejectedValue(error);
      
      // Should not throw
      await expect(fileService.ensureDir('existing/dir')).resolves.not.toThrow();
    });

    test('readdir reads directory contents', async () => {
      (fsPromises.stat as jest.Mock).mockImplementation((path) => {
        return Promise.resolve({
          isFile: () => !path.includes('subdir'),
          isDirectory: () => path.includes('subdir')
        } as unknown as Stats);
      });
      
      const result = await fileService.readdir('dir');
      
      expect(fsPromises.readdir).toHaveBeenCalled();
      expect(result).toEqual(['file1.txt', 'file2.txt', 'subdir']);
    });

    test('readdir applies ignore rules when specified', async () => {
      (fsPromises.readdir as jest.Mock).mockResolvedValue(['file1.txt', 'node_modules', 'subdir']);
      (fsPromises.stat as jest.Mock).mockImplementation((path) => {
        return Promise.resolve({
          isFile: () => !path.includes('subdir') && !path.includes('node_modules'),
          isDirectory: () => path.includes('subdir') || path.includes('node_modules')
        } as unknown as Stats);
      });
      
      const result = await fileService.readdir('dir', { applyIgnores: true });
      
      // node_modules should be filtered out by the ignore rule in mock
      expect(result).toEqual(['file1.txt', 'subdir']);
    });

    test('readdir works with absolute paths outside the project', async () => {
      const result = await fileService.readdir('/resources/prompts');
      
      expect(fsPromises.readdir).toHaveBeenCalled();
      // Should not try to apply ignore rules for external paths
      expect(result).toEqual(['file1.txt', 'file2.txt', 'subdir']);
    });
  });

  describe('Watcher Management', () => {
    test('watch sets up chokidar watcher', () => {
      const callback = jest.fn();
      
      fileService.watch('dir', callback);
      
      expect(chokidar.watch).toHaveBeenCalled();
      expect(mockChokidarWatcher.on).toHaveBeenCalledWith('all', expect.any(Function));
    });

    test('watch returns unsubscribe function', () => {
      const callback = jest.fn();
      
      const unsubscribe = fileService.watch('dir', callback);
      unsubscribe();
      
      expect(mockChokidarWatcher.close).toHaveBeenCalled();
    });

    test('cleanupWatchers closes all watchers', async () => {
      // Setup multiple watchers
      fileService.watch('dir1', jest.fn());
      fileService.watch('dir2', jest.fn());
      
      await fileService.cleanupWatchers();
      
      expect(mockChokidarWatcher.close).toHaveBeenCalledTimes(2);
      expect(fileService['watchers'].size).toBe(0);
    });

    test('watch can watch absolute paths outside the project', () => {
      const callback = jest.fn();
      
      fileService.watch('/tmp/watch-dir', callback);
      
      expect(chokidar.watch).toHaveBeenCalled();
    });
  });

  describe('Application/Resource Path Helpers', () => {
    test('getAppPath returns app path', () => {
      const result = fileService.getAppPath();
      expect(result).toBe('/app/path');
    });

    test('getResourcesPath returns resources path for development', async () => {
      const result = await fileService.getResourcesPath();
      expect(result).toBe('/app/path/resources');
    });

    test('getPromptTemplatePath returns template path', async () => {
      const result = await fileService.getPromptTemplatePath('template.xml');
      expect(result).toBe('/app/path/resources/prompts/template.xml');
    });
  });
});
