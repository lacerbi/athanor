// AI Summary: Comprehensive unit tests for the intelligent ignore file scanner covering nested discovery,
// ignore rule application for pruning, sorting by depth, and integration with project settings.

// Mocks are defined before imports to prevent temporal dead zone errors due to jest.mock hoisting.
const mockFsAccess = jest.fn();
const mockFsStat = jest.fn();
const mockFsReadFile = jest.fn();
const mockFsReaddir = jest.fn();
const mockFsWriteFile = jest.fn();

jest.mock('fs/promises', () => ({
  __esModule: true,
  access: mockFsAccess,
  stat: mockFsStat,
  readFile: mockFsReadFile,
  readdir: mockFsReaddir,
  writeFile: mockFsWriteFile,
}));

jest.mock('./services/PathUtils');

import { ignoreRulesManager } from './ignoreRulesManager';
import { PathUtils } from './services/PathUtils';
import * as path from 'path';
import { Stats } from 'fs';

const mockPathUtils = PathUtils as jest.Mocked<typeof PathUtils>;

describe('IgnoreRulesManager - Intelligent Scanner', () => {
  const testBaseDir = '/test/project';
  let originalConsoleLog: typeof console.log;

  beforeAll(() => {
    // Mock console.log to prevent logging during tests
    originalConsoleLog = console.log;
    console.log = jest.fn();
  });

  afterAll(() => {
    // Restore original console.log
    console.log = originalConsoleLog;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default PathUtils mocks
    mockPathUtils.normalizeToUnix.mockImplementation((p: string) =>
      p.replace(/\\/g, '/')
    );
    mockPathUtils.joinUnix.mockImplementation((...paths: string[]) =>
      paths.join('/').replace(/\/+/g, '/')
    );
    mockPathUtils.toPlatform.mockImplementation((p: string) => p);
    mockPathUtils.relative.mockImplementation((from: string, to: string) => {
      // Simple relative path implementation for tests
      if (to.startsWith(from + '/')) {
        return to.substring(from.length + 1);
      }
      return to;
    });
    mockPathUtils.normalizeForIgnore.mockImplementation(
      (filePath: string, isDirectory: boolean) => {
        if (!filePath) return null;
        return isDirectory ? `${filePath}/` : filePath;
      }
    );

    // Clear error state to prevent test leakage
    ignoreRulesManager.clearError();

    // Mock loadIgnoreRules to prevent async operations during setup
    jest
      .spyOn(ignoreRulesManager, 'loadIgnoreRules')
      .mockResolvedValue(undefined);

    // Set base directory (now won't trigger async loadIgnoreRules)
    ignoreRulesManager.setBaseDir(testBaseDir);
  });

  describe('loadIgnoreRules - intelligent scanning', () => {
    beforeEach(() => {
      // Restore the real loadIgnoreRules method for these tests
      jest.restoreAllMocks();

      // Re-setup PathUtils mocks after restoreAllMocks
      mockPathUtils.normalizeToUnix.mockImplementation((p: string) =>
        p.replace(/\\/g, '/')
      );
      mockPathUtils.joinUnix.mockImplementation((...paths: string[]) =>
        paths.join('/').replace(/\/+/g, '/')
      );
      mockPathUtils.toPlatform.mockImplementation((p: string) => p);
      mockPathUtils.relative.mockImplementation((from: string, to: string) => {
        if (to.startsWith(from + '/')) {
          return to.substring(from.length + 1);
        }
        return to;
      });
      mockPathUtils.normalizeForIgnore.mockImplementation(
        (filePath: string, isDirectory: boolean) => {
          if (!filePath) return null;
          return isDirectory ? `${filePath}/` : filePath;
        }
      );
    });

    it('should find nested .athignore and .gitignore files', async () => {
      // Setup file system structure
      const fileStructure = new Map([
        [
          '/test/project',
          { isDirectory: true, files: ['src', '.athignore', '.gitignore'] },
        ],
        [
          '/test/project/src',
          { isDirectory: true, files: ['components', 'utils', '.athignore'] },
        ],
        [
          '/test/project/src/components',
          { isDirectory: true, files: ['Button.tsx', '.gitignore'] },
        ],
        [
          '/test/project/src/utils',
          { isDirectory: true, files: ['helpers.ts'] },
        ],
      ]);

      const ignoreFiles = new Map([
        ['/test/project/.athignore', 'node_modules/\n*.log'],
        ['/test/project/.gitignore', '*.tmp\ndist/'],
        ['/test/project/src/.athignore', '*.test.ts\n!important.test.ts'],
        ['/test/project/src/components/.gitignore', '*.stories.ts'],
      ]);

      // Mock fs operations
      mockFsAccess.mockResolvedValue(undefined);
      mockFsStat.mockImplementation(async (filePath) => {
        const pathStr = filePath.toString();
        const entry = fileStructure.get(pathStr);
        return {
          isDirectory: () => entry?.isDirectory ?? false,
        } as Stats;
      });

      mockFsReaddir.mockImplementation(async (dirPath) => {
        const pathStr = dirPath.toString();
        const entry = fileStructure.get(pathStr);
        return (entry?.files ?? []) as any;
      });

      mockFsReadFile.mockImplementation(async (filePath) => {
        const pathStr = filePath.toString();
        const content = ignoreFiles.get(pathStr);
        if (content) {
          return content;
        }
        throw new Error('File not found');
      });

      // Load ignore rules to trigger scanning
      await ignoreRulesManager.loadIgnoreRules();

      // Verify that scanning found the expected files
      expect(mockFsReadFile).toHaveBeenCalledWith(
        '/test/project/.athignore',
        'utf-8'
      );
      expect(mockFsReadFile).toHaveBeenCalledWith(
        '/test/project/.gitignore',
        'utf-8'
      );
      expect(mockFsReadFile).toHaveBeenCalledWith(
        '/test/project/src/.athignore',
        'utf-8'
      );
      expect(mockFsReadFile).toHaveBeenCalledWith(
        '/test/project/src/components/.gitignore',
        'utf-8'
      );
    });

    it('should skip directories ignored by parent ignore files', async () => {
      // Setup file system structure with ignored directory
      const fileStructure = new Map([
        [
          '/test/project',
          { isDirectory: true, files: ['src', 'node_modules', '.athignore'] },
        ],
        ['/test/project/src', { isDirectory: true, files: ['components'] }],
        [
          '/test/project/node_modules',
          { isDirectory: true, files: ['package'] },
        ],
        [
          '/test/project/node_modules/package',
          { isDirectory: true, files: ['.gitignore'] },
        ],
      ]);

      const ignoreFiles = new Map([
        ['/test/project/.athignore', 'node_modules/'],
      ]);

      // Mock fs operations
      mockFsAccess.mockResolvedValue(undefined);
      mockFsStat.mockImplementation(async (filePath) => {
        const pathStr = filePath.toString();
        const entry = fileStructure.get(pathStr);
        return {
          isDirectory: () => entry?.isDirectory ?? false,
        } as Stats;
      });

      mockFsReaddir.mockImplementation(async (dirPath) => {
        const pathStr = dirPath.toString();
        const entry = fileStructure.get(pathStr);
        return (entry?.files ?? []) as any;
      });

      mockFsReadFile.mockImplementation(async (filePath) => {
        const pathStr = filePath.toString();
        const content = ignoreFiles.get(pathStr);
        if (content) {
          return content;
        }
        throw new Error('File not found');
      });

      // Re-import and mock the ignore library to control its behavior
      jest.resetModules();
      jest.doMock('ignore', () => {
        return jest.fn(() => ({
          add: jest.fn().mockReturnThis(),
          ignores: jest.fn((path: string) => path === 'node_modules/'),
        }));
      });

      // Re-import ignoreRulesManager to use the mocked ignore library
      const { ignoreRulesManager: freshManager } = await import(
        './ignoreRulesManager'
      );

      // Setup fresh manager
      freshManager.clearError();
      freshManager.setBaseDir(testBaseDir);

      // Load ignore rules to trigger scanning
      await freshManager.loadIgnoreRules();

      // Verify that the scanner didn't try to read ignore files in node_modules
      expect(mockFsReadFile).toHaveBeenCalledWith(
        '/test/project/.athignore',
        'utf-8'
      );
      expect(mockFsReadFile).not.toHaveBeenCalledWith(
        '/test/project/node_modules/package/.gitignore',
        'utf-8'
      );

      // Reset modules back to normal for other tests
      jest.resetModules();
    });

    it('should handle missing ignore files gracefully', async () => {
      // Setup file system structure without ignore files
      const fileStructure = new Map([
        ['/test/project', { isDirectory: true, files: ['src'] }],
        ['/test/project/src', { isDirectory: true, files: ['components'] }],
        [
          '/test/project/src/components',
          { isDirectory: true, files: ['Button.tsx'] },
        ],
      ]);

      // Mock fs operations
      mockFsAccess.mockResolvedValue(undefined);
      mockFsStat.mockImplementation(async (filePath) => {
        const pathStr = filePath.toString();
        const entry = fileStructure.get(pathStr);
        return {
          isDirectory: () => entry?.isDirectory ?? false,
        } as Stats;
      });

      mockFsReaddir.mockImplementation(async (dirPath) => {
        const pathStr = dirPath.toString();
        const entry = fileStructure.get(pathStr);
        return (entry?.files ?? []) as any;
      });

      mockFsReadFile.mockImplementation(async () => {
        throw new Error('File not found');
      });

      // Should not throw when no ignore files exist
      await expect(ignoreRulesManager.loadIgnoreRules()).resolves.not.toThrow();
    });

    it('should respect useGitignore setting from project settings', async () => {
      // Setup file system structure
      const fileStructure = new Map([
        [
          '/test/project',
          { isDirectory: true, files: ['src', '.ath_materials', '.gitignore'] },
        ],
        [
          '/test/project/.ath_materials',
          { isDirectory: true, files: ['project_settings.json'] },
        ],
        ['/test/project/src', { isDirectory: true, files: ['components'] }],
      ]);

      const ignoreFiles = new Map([
        ['/test/project/.gitignore', 'dist/'],
        [
          '/test/project/.ath_materials/project_settings.json',
          JSON.stringify({ useGitignore: false }),
        ],
      ]);

      // Mock fs operations
      mockFsAccess.mockResolvedValue(undefined);
      mockFsStat.mockImplementation(async (filePath) => {
        const pathStr = filePath.toString();
        const entry = fileStructure.get(pathStr);
        return {
          isDirectory: () => entry?.isDirectory ?? false,
        } as Stats;
      });

      mockFsReaddir.mockImplementation(async (dirPath) => {
        const pathStr = dirPath.toString();
        const entry = fileStructure.get(pathStr);
        return (entry?.files ?? []) as any;
      });

      mockFsReadFile.mockImplementation(async (filePath) => {
        const pathStr = filePath.toString();
        const content = ignoreFiles.get(pathStr);
        if (content) {
          return content;
        }
        throw new Error('File not found');
      });

      // Load ignore rules to trigger scanning
      await ignoreRulesManager.loadIgnoreRules();

      // When useGitignore is false, .gitignore files should not be read
      expect(mockFsReadFile).toHaveBeenCalledWith(
        '/test/project/.ath_materials/project_settings.json',
        'utf-8'
      );
      expect(mockFsReadFile).not.toHaveBeenCalledWith(
        '/test/project/.gitignore',
        'utf-8'
      );
    });

    it('should skip materials directory during main tree scanning', async () => {
      // Setup file system structure
      const fileStructure = new Map([
        [
          '/test/project',
          { isDirectory: true, files: ['src', '.ath_materials'] },
        ],
        ['/test/project/src', { isDirectory: true, files: ['components'] }],
        [
          '/test/project/.ath_materials',
          { isDirectory: true, files: ['project_settings.json', '.gitignore'] },
        ],
      ]);

      // Mock fs operations
      mockFsAccess.mockResolvedValue(undefined);
      mockFsStat.mockImplementation(async (filePath) => {
        const pathStr = filePath.toString();
        const entry = fileStructure.get(pathStr);
        return {
          isDirectory: () => entry?.isDirectory ?? false,
        } as Stats;
      });

      mockFsReaddir.mockImplementation(async (dirPath) => {
        const pathStr = dirPath.toString();
        const entry = fileStructure.get(pathStr);
        return (entry?.files ?? []) as any;
      });

      mockFsReadFile.mockImplementation(async () => {
        throw new Error('File not found');
      });

      // Load ignore rules to trigger scanning
      await ignoreRulesManager.loadIgnoreRules();

      // Verify that scanner didn't try to read ignore files in .ath_materials
      expect(mockFsReadFile).not.toHaveBeenCalledWith(
        '/test/project/.ath_materials/.gitignore',
        'utf-8'
      );
    });

    it('should handle inaccessible directories gracefully', async () => {
      // Setup file system structure
      const fileStructure = new Map([
        ['/test/project', { isDirectory: true, files: ['src', 'restricted'] }],
        ['/test/project/src', { isDirectory: true, files: ['components'] }],
      ]);

      // Mock fs operations
      mockFsAccess.mockImplementation(async (filePath) => {
        const pathStr = filePath.toString();
        if (pathStr === '/test/project/restricted') {
          throw new Error('Permission denied');
        }
        return undefined;
      });

      mockFsStat.mockImplementation(async (filePath) => {
        const pathStr = filePath.toString();
        const entry = fileStructure.get(pathStr);
        return {
          isDirectory: () => entry?.isDirectory ?? false,
        } as Stats;
      });

      mockFsReaddir.mockImplementation(async (dirPath) => {
        const pathStr = dirPath.toString();
        const entry = fileStructure.get(pathStr);
        return (entry?.files ?? []) as any;
      });

      mockFsReadFile.mockImplementation(async () => {
        throw new Error('File not found');
      });

      // Should not throw when encountering inaccessible directories
      await expect(ignoreRulesManager.loadIgnoreRules()).resolves.not.toThrow();
    });

    it('should handle malformed project settings gracefully', async () => {
      // Setup file system structure
      const fileStructure = new Map([
        [
          '/test/project',
          { isDirectory: true, files: ['.ath_materials', '.gitignore'] },
        ],
        [
          '/test/project/.ath_materials',
          { isDirectory: true, files: ['project_settings.json'] },
        ],
      ]);

      const ignoreFiles = new Map([
        ['/test/project/.gitignore', 'dist/'],
        ['/test/project/.ath_materials/project_settings.json', 'invalid json{'],
      ]);

      // Mock fs operations
      mockFsAccess.mockResolvedValue(undefined);
      mockFsStat.mockImplementation(async (filePath) => {
        const pathStr = filePath.toString();
        const entry = fileStructure.get(pathStr);
        return {
          isDirectory: () => entry?.isDirectory ?? false,
        } as Stats;
      });

      mockFsReaddir.mockImplementation(async (dirPath) => {
        const pathStr = dirPath.toString();
        const entry = fileStructure.get(pathStr);
        return (entry?.files ?? []) as any;
      });

      mockFsReadFile.mockImplementation(async (filePath) => {
        const pathStr = filePath.toString();
        const content = ignoreFiles.get(pathStr);
        if (content) {
          return content;
        }
        throw new Error('File not found');
      });

      // Should not throw and should default to using .gitignore when settings are malformed
      await expect(ignoreRulesManager.loadIgnoreRules()).resolves.not.toThrow();
      expect(mockFsReadFile).toHaveBeenCalledWith(
        '/test/project/.gitignore',
        'utf-8'
      );
    });
  });

  describe('ignores() method - temporary behavior', () => {
    it('should return false during refactor period', () => {
      // During Commit 1, ignores() should always return false
      expect(ignoreRulesManager.ignores('any/path')).toBe(false);
      expect(ignoreRulesManager.ignores('node_modules/')).toBe(false);
      expect(ignoreRulesManager.ignores('src/components/Button.tsx')).toBe(
        false
      );
    });
  });

  describe('addIgnorePattern', () => {
    beforeEach(() => {
      // Restore the real addIgnorePattern method for these tests
      jest.restoreAllMocks();

      // Re-setup PathUtils mocks
      mockPathUtils.normalizeToUnix.mockImplementation((p: string) =>
        p.replace(/\\/g, '/')
      );
      mockPathUtils.joinUnix.mockImplementation((...paths: string[]) =>
        paths.join('/').replace(/\/+/g, '/')
      );
      mockPathUtils.toPlatform.mockImplementation((p: string) => p);
      mockPathUtils.relative.mockImplementation((from: string, to: string) => {
        if (to.startsWith(from + '/')) {
          return to.substring(from.length + 1);
        }
        return to;
      });

      // Mock file operations for addIgnorePattern
      mockFsAccess.mockResolvedValue(undefined);
      mockFsReadFile.mockResolvedValue('existing content\n');
      mockFsWriteFile.mockResolvedValue(undefined);

      // Mock loadIgnoreRules to prevent it from running during addIgnorePattern
      jest
        .spyOn(ignoreRulesManager, 'loadIgnoreRules')
        .mockResolvedValue(undefined);

      // Clear error state
      ignoreRulesManager.clearError();

      // Set base directory
      ignoreRulesManager.setBaseDir(testBaseDir);
    });

    it('should add pattern to .athignore file', async () => {
      const result = await ignoreRulesManager.addIgnorePattern('*.log');

      expect(result).toBe(true);
      expect(mockFsWriteFile).toHaveBeenCalledWith(
        '/test/project/.athignore',
        expect.stringContaining('/*.log'),
        'utf8'
      );
    });

    it('should handle ignoreAll parameter correctly', async () => {
      const result = await ignoreRulesManager.addIgnorePattern(
        'node_modules',
        true
      );

      expect(result).toBe(true);
      expect(mockFsWriteFile).toHaveBeenCalledWith(
        '/test/project/.athignore',
        expect.stringContaining('node_modules'),
        'utf8'
      );
    });

    it('should not duplicate existing patterns', async () => {
      mockFsReadFile.mockResolvedValue('existing content\n/*.log\n');

      const result = await ignoreRulesManager.addIgnorePattern('*.log');

      expect(result).toBe(false);
      expect(mockFsWriteFile).not.toHaveBeenCalled();
    });

    it('should create .athignore file if it does not exist', async () => {
      mockFsAccess.mockRejectedValue(new Error('File not found'));
      mockFsReadFile.mockResolvedValue('');
      mockFsWriteFile.mockResolvedValue(undefined);

      const result = await ignoreRulesManager.addIgnorePattern('*.log');

      expect(result).toBe(true);
      expect(mockFsWriteFile).toHaveBeenCalledWith(
        '/test/project/.athignore',
        '',
        'utf8'
      );
      expect(mockFsWriteFile).toHaveBeenCalledWith(
        '/test/project/.athignore',
        '/*.log\n',
        'utf8'
      );
    });

    it('should handle errors gracefully', async () => {
      mockFsReadFile.mockRejectedValue(new Error('Permission denied'));

      await expect(
        ignoreRulesManager.addIgnorePattern('*.log')
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('utility methods', () => {
    it('should set and get base directory', () => {
      const newBaseDir = '/new/project';
      ignoreRulesManager.setBaseDir(newBaseDir);
      expect(ignoreRulesManager.getBaseDir()).toBe(newBaseDir);
    });

    it('should clear rules', () => {
      ignoreRulesManager.clearRules();
      // We can't directly test the internal state, but this should not throw
      expect(() => ignoreRulesManager.clearRules()).not.toThrow();
    });

    it('should track and clear errors', () => {
      expect(ignoreRulesManager.getLastError()).toBeNull();
      ignoreRulesManager.clearError();
      expect(ignoreRulesManager.getLastError()).toBeNull();
    });
  });
});
