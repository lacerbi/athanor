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

jest.mock('./services/PathUtils', () => ({
  __esModule: true,
  PathUtils: {
    normalizeToUnix: jest.fn((p: string) => (p ? p.replace(/\\/g, '/') : p)),
    joinUnix: jest.fn((...paths: string[]) => path.posix.join(...paths)),
    toPlatform: jest.fn((p: string) => p),
    relative: jest.fn((from: string, to: string) =>
      path.posix.relative(from, to)
    ),
    normalizeForIgnore: jest.fn(
      (filePath: string, isDirectory: boolean) => {
        if (!filePath) return null;
        let norm = filePath.replace(/\\/g, '/');
        if (isDirectory && !norm.endsWith('/')) {
          norm += '/';
        }
        return norm;
      }
    ),
    getAncestors: jest.fn((filePath) => {
      if (!filePath || filePath === '.') return ['.'];
      const normalized = filePath.replace(/\\/g, '/').replace(/\/$/, '');
      const dirname = path.posix.dirname(normalized);
      if (dirname === '.' || dirname === '') return ['.'];

      const ancestors = [];
      let current = dirname;
      while (current && current !== '.' && current !== '/') {
        ancestors.push(current);
        const parent = path.posix.dirname(current);
        if (parent === current) break;
        current = parent;
      }
      ancestors.push('.');
      return ancestors;
    }),
  },
}));

import { ignoreRulesManager } from './ignoreRulesManager';
import * as path from 'path';
import { Stats } from 'fs';

describe('IgnoreRulesManager - Intelligent Scanner', () => {
  const testBaseDir = '/test/project';
  let originalConsoleLog: typeof console.log;
  let originalConsoleError: typeof console.error;
  let originalConsoleWarn: typeof console.warn;
  let loadIgnoreRulesSpy: jest.SpyInstance;

  beforeAll(() => {
    // Mock console to prevent logging during tests
    originalConsoleLog = console.log;
    console.log = jest.fn();
    originalConsoleError = console.error;
    console.error = jest.fn();
    originalConsoleWarn = console.warn;
    console.warn = jest.fn();
  });

  afterAll(() => {
    // Restore original console
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
   });

  beforeEach(() => {
    jest.clearAllMocks();

    // Clear error state to prevent test leakage
    ignoreRulesManager.clearError();

    // Reset debounce timer to prevent state leakage between tests
    (ignoreRulesManager as any).lastLoadTime = 0;

    // Mock loadIgnoreRules for tests that don't call the real method.
    // This spy is restored in the 'loadIgnoreRules' describe block.
    loadIgnoreRulesSpy = jest
      .spyOn(ignoreRulesManager, 'loadIgnoreRules')
      .mockResolvedValue(undefined);

    // Set base directory (now won't trigger async loadIgnoreRules)
    ignoreRulesManager.setBaseDir(testBaseDir);
  });

  describe('loadIgnoreRules - intelligent scanning', () => {
    beforeEach(() => {
      // Restore the real loadIgnoreRules method for these tests
      loadIgnoreRulesSpy.mockRestore();
    });

    it('should find nested .athignore and .gitignore files', async () => {
      // Setup file system structure
      const fileStructure = new Map([
        [
          '/test/project',
          {
            isDirectory: true,
            files: ['src', '.athignore', '.gitignore', '.ath_materials'],
          },
        ],
        [
          '/test/project/.ath_materials',
          { isDirectory: true, files: ['project_settings.json'] },
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
        ['/test/project/.ath_materials/project_settings.json', '{}'],
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
        if (content !== undefined) {
          return content;
        }
        // If a file is not in the map, simulate a "file not found" error.
        const error = new Error(`ENOENT: no such file or directory, open '${pathStr}'`);
        (error as NodeJS.ErrnoException).code = 'ENOENT';
        throw error;
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

    it('should skip directories ignored by parent ignore files (Root Pruning)', async () => {
      // Setup file system structure with ignored directory
      const fileStructure = new Map([
        [
          '/test/project',
          {
            isDirectory: true,
            files: ['src', 'node_modules', '.gitignore', '.ath_materials'],
          },
        ],
        [
          '/test/project/.ath_materials',
          { isDirectory: true, files: ['project_settings.json'] },
        ],
        ['/test/project/src', { isDirectory: true, files: ['components'] }],
        [
          '/test/project/node_modules',
          { isDirectory: true, files: ['package'] },
        ],
        [
          '/test/project/node_modules/package',
          { isDirectory: true, files: ['.gitignore'] }, // This should never be read
        ],
      ]);

      const ignoreFiles = new Map([
        ['/test/project/.ath_materials/project_settings.json', '{}'],
        ['/test/project/.gitignore', 'node_modules/'],
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
        if (content !== undefined) {
          return content;
        }
        const error = new Error(`ENOENT: no such file or directory, open '${pathStr}'`);
        (error as NodeJS.ErrnoException).code = 'ENOENT';
        throw error;
      });

      // Load ignore rules to trigger scanning
      await ignoreRulesManager.loadIgnoreRules();

      // Verify that the root .gitignore was read for pruning
      expect(mockFsReadFile).toHaveBeenCalledWith(
        '/test/project/.gitignore',
        'utf-8'
      );
      // Verify that the scanner did NOT try to read any files inside node_modules
      expect(mockFsReadFile).not.toHaveBeenCalledWith(
        '/test/project/node_modules/package/.gitignore',
        'utf-8'
      );
    });

    it('should handle missing ignore files gracefully', async () => {
      // Setup file system structure without ignore files
      const fileStructure = new Map([
        ['/test/project', { isDirectory: true, files: ['src', '.ath_materials'] }],
        ['/test/project/.ath_materials', { isDirectory: true, files: [] }],
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

      mockFsReadFile.mockImplementation(async (filePath) => {
        const error = new Error(`ENOENT for read ${filePath}`);
        (error as NodeJS.ErrnoException).code = 'ENOENT';
        throw error;
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
        const error = new Error(`ENOENT for read ${filePath}`);
        (error as NodeJS.ErrnoException).code = 'ENOENT';
        throw error;
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

      mockFsReadFile.mockImplementation(async (filePath) => {
        // Only project_settings.json should be read
        if (
          filePath === '/test/project/.ath_materials/project_settings.json'
        ) {
          return '{}';
        }
        const error = new Error(`ENOENT for read ${filePath}`);
        (error as NodeJS.ErrnoException).code = 'ENOENT';
        throw error;
      });

      // Load ignore rules to trigger scanning
      await ignoreRulesManager.loadIgnoreRules();

      // Verify that scanner read project settings but not ignore files in .ath_materials
      expect(mockFsReadFile).toHaveBeenCalledWith(
        '/test/project/.ath_materials/project_settings.json',
        'utf-8'
      );
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
        // 'restricted' directory is defined, but readdir will fail for it
        ['/test/project/restricted', { isDirectory: true, files: [] }],
      ]);

      // Mock fs operations
      mockFsAccess.mockResolvedValue(undefined); // Allow access check to pass

      mockFsStat.mockImplementation(async (filePath) => {
        const pathStr = filePath.toString();
        const entry = fileStructure.get(pathStr);
        return {
          isDirectory: () => entry?.isDirectory ?? false,
        } as Stats;
      });

      mockFsReaddir.mockImplementation(async (dirPath) => {
        const pathStr = dirPath.toString();
        // Fail readdir for the 'restricted' directory to trigger the console.warn
        if (pathStr === '/test/project/restricted') {
          throw new Error('Permission denied on readdir');
        }
        const entry = fileStructure.get(pathStr);
        return (entry?.files ?? []) as any;
      });

      mockFsReadFile.mockImplementation(async (filePath) => {
        const error = new Error(`ENOENT for read ${filePath}`);
        (error as NodeJS.ErrnoException).code = 'ENOENT';
        throw error;
      });

      // Should not throw when encountering inaccessible directories
      await expect(ignoreRulesManager.loadIgnoreRules()).resolves.not.toThrow();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error reading directory restricted'),
        expect.any(Error)
      );
    });

    it('should handle malformed project settings gracefully and use defaults', async () => {
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
        const error = new Error(`ENOENT for read ${filePath}`);
        (error as NodeJS.ErrnoException).code = 'ENOENT';
        throw error;
      });

      await ignoreRulesManager.loadIgnoreRules();

      // Should not throw, should log a warning, and should proceed with defaults
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Could not read or parse project_settings.json'));
      
      // Should have attempted to read project settings
      expect(mockFsReadFile).toHaveBeenCalledWith(
        '/test/project/.ath_materials/project_settings.json',
        'utf-8'
      );
      // Should have fallen back to default (useGitignore: true) and read .gitignore
      expect(mockFsReadFile).toHaveBeenCalledWith(
        '/test/project/.gitignore',
        'utf-8'
      );
      
      // Verify the rule from .gitignore was actually loaded
      expect(ignoreRulesManager.ignores('dist/')).toBe(true);
    });
  });

  describe('ignores() method - Compiled Ruleset', () => {
    beforeEach(() => {
      // Restore the real loadIgnoreRules method for these tests
      loadIgnoreRulesSpy.mockRestore();
    });

    const setupFS = (
      files: Map<string, { isDirectory: boolean; files?: string[] }>,
      ignoreContent: Map<string, string>
    ) => {
      mockFsAccess.mockResolvedValue(undefined);
      mockFsStat.mockImplementation(async (filePath) => {
        const pathStr = filePath.toString();
        const entry = files.get(pathStr);
        if (!entry) throw new Error('ENOENT for stat');
        return { isDirectory: () => entry.isDirectory } as Stats;
      });
      mockFsReaddir.mockImplementation(async (dirPath) => {
        const pathStr = dirPath.toString();
        return (files.get(pathStr)?.files ?? []) as any;
      });
      mockFsReadFile.mockImplementation(async (filePath) => {
        const pathStr = filePath.toString();
        const content = ignoreContent.get(pathStr);
        if (content !== undefined) return content;
        const error = new Error(`ENOENT for read`);
        (error as NodeJS.ErrnoException).code = 'ENOENT';
        throw error;
      });
    };

    describe('Hierarchical Logic - Parent/Child Overrides', () => {
      it('should handle parent ignores, child un-ignores', async () => {
        const fileStructure = new Map([
          [
            '/test/project',
            { isDirectory: true, files: ['.gitignore', 'src', '.ath_materials'] },
          ],
          [
            '/test/project/.ath_materials',
            { isDirectory: true, files: ['project_settings.json'] },
          ],
          [
            '/test/project/src',
            { isDirectory: true, files: ['.gitignore', 'important.log'] },
          ],
        ]);
        const ignoreFiles = new Map([
          ['/test/project/.ath_materials/project_settings.json', '{}'],
          ['/test/project/.gitignore', '*.log'],
          ['/test/project/src/.gitignore', '!important.log'],
        ]);
        setupFS(fileStructure, ignoreFiles);
        await ignoreRulesManager.loadIgnoreRules();

        expect(ignoreRulesManager.ignores('src/important.log')).toBe(false);
        expect(ignoreRulesManager.ignores('src/other.log')).toBe(true);
        expect(ignoreRulesManager.ignores('root.log')).toBe(true);
      });

      it('should correctly scope nested patterns to their own directories', async () => {
        const fileStructure = new Map([
          [
            '/test/project',
            {
              isDirectory: true,
              files: [
                '.gitignore',
                'src',
                'docs',
                'root.log',
                'root.tmp',
                '.ath_materials',
              ],
            },
          ],
          [
            '/test/project/.ath_materials',
            { isDirectory: true, files: ['project_settings.json'] },
          ],
          [
            '/test/project/src',
            {
              isDirectory: true,
              files: ['.gitignore', 'component.log', 'component.tmp', 'sub/'],
            },
          ],
          [
            '/test/project/src/sub',
            { isDirectory: true, files: ['deep.log'] },
          ],
          [
            '/test/project/docs',
            { isDirectory: true, files: ['.gitignore', 'guide.md', 'guide.log'] },
          ],
        ]);
        const ignoreFiles = new Map([
          ['/test/project/.ath_materials/project_settings.json', '{}'],
          ['/test/project/.gitignore', '*.tmp'], // Ignore all .tmp files
          ['/test/project/src/.gitignore', '*.log'], // Ignore .log files only within src
          ['/test/project/docs/.gitignore', 'guide.md'], // Ignore guide.md only within docs
        ]);

        setupFS(fileStructure, ignoreFiles);
        await ignoreRulesManager.loadIgnoreRules();

        // Test scoping of src/.gitignore
        expect(ignoreRulesManager.ignores('src/component.log')).toBe(true);
        expect(ignoreRulesManager.ignores('src/sub/deep.log')).toBe(true);
        expect(ignoreRulesManager.ignores('root.log')).toBe(false); // Was incorrectly true before
        expect(ignoreRulesManager.ignores('docs/guide.log')).toBe(false); // Was incorrectly true before

        // Test scoping of docs/.gitignore
        expect(ignoreRulesManager.ignores('docs/guide.md')).toBe(true);
        expect(ignoreRulesManager.ignores('guide.md')).toBe(false); // if there was a root one

        // Test root .gitignore is still global
        expect(ignoreRulesManager.ignores('root.tmp')).toBe(true);
        expect(ignoreRulesManager.ignores('src/component.tmp')).toBe(true);
      });

      it('should handle various pattern types (slashes, negations) correctly in nested files', async () => {
        const fileStructure = new Map([
          [
            '/test/project',
            {
              isDirectory: true,
              files: ['.gitignore', 'src', '.ath_materials', 'config.js'],
            },
          ],
          [
            '/test/project/.ath_materials',
            { isDirectory: true, files: ['project_settings.json'] },
          ],
          [
            '/test/project/src',
            {
              isDirectory: true,
              files: ['.gitignore', 'build/', 'output', 'config.js', 'lib/'],
            },
          ],
          [
            '/test/project/src/build',
            { isDirectory: true, files: ['app.js'] },
          ],
          [
            '/test/project/src/lib',
            { isDirectory: true, files: ['config.js', 'other.js'] },
          ],
        ]);
        const ignoreFiles = new Map([
          ['/test/project/.ath_materials/project_settings.json', '{}'],
          // Parent rule: ignore all config.js files
          ['/test/project/.gitignore', 'config.js'],
          // Child rules in src/
          ['/test/project/src/.gitignore', 'build/\n/output\n!/config.js'],
        ]);

        setupFS(fileStructure, ignoreFiles);
        await ignoreRulesManager.loadIgnoreRules();

        // 1. Pattern with a trailing slash: `build/` in `src/`. Should ignore `src/build/`.
        expect(ignoreRulesManager.ignores('src/build/')).toBe(true);
        expect(ignoreRulesManager.ignores('src/build/app.js')).toBe(true);
        expect(ignoreRulesManager.ignores('build/')).toBe(false);

        // 2. Pattern with a leading slash: `/output` in `src/`. Should ignore `src/output` only.
        // Transformed to `src/output`.
        expect(ignoreRulesManager.ignores('src/output')).toBe(true);

        // 3. Negated pattern `!/config.js` in `src/` should un-ignore a file ignored by parent.
        // Parent rule `config.js` ignores all files named 'config.js'.
        // Child rule `!/config.js` is transformed to `!src/config.js`, which is an anchored un-ignore.
        expect(ignoreRulesManager.ignores('src/config.js')).toBe(false); // Un-ignored by child rule.
        expect(ignoreRulesManager.ignores('src/lib/config.js')).toBe(true); // Should remain ignored by parent rule.
        expect(ignoreRulesManager.ignores('config.js')).toBe(true); // A root config.js should still be ignored.
      });
    });

    describe('Athanor-First Precedence', () => {
      it('should prioritize .athignore un-ignore over .gitignore ignore', async () => {
        const fileStructure = new Map([
          ['/test/project', { isDirectory: true, files: ['.athignore', '.gitignore', 'config.json', '.ath_materials'] }],
          ['/test/project/.ath_materials', { isDirectory: true, files: ['project_settings.json'] }],
        ]);
        const ignoreFiles = new Map([
          ['/test/project/.ath_materials/project_settings.json', '{}'],
          ['/test/project/.gitignore', 'config.json'],
          ['/test/project/.athignore', '!config.json'],
        ]);
        setupFS(fileStructure, ignoreFiles);
        await ignoreRulesManager.loadIgnoreRules();
        
        expect(ignoreRulesManager.ignores('config.json')).toBe(false);
      });

      it('should prioritize .athignore ignore over .gitignore un-ignore', async () => {
        const fileStructure = new Map([
          ['/test/project', { isDirectory: true, files: ['.athignore', '.gitignore', 'config.json', '.ath_materials'] }],
          ['/test/project/.ath_materials', { isDirectory: true, files: ['project_settings.json'] }],
        ]);
        const ignoreFiles = new Map([
          ['/test/project/.ath_materials/project_settings.json', '{}'],
          ['/test/project/.gitignore', '!config.json'],
          ['/test/project/.athignore', 'config.json'],
        ]);
        setupFS(fileStructure, ignoreFiles);
        await ignoreRulesManager.loadIgnoreRules();
        
        expect(ignoreRulesManager.ignores('config.json')).toBe(true);
      });

      it('should fall back to .gitignore when .athignore has no opinion', async () => {
        const fileStructure = new Map([
          ['/test/project', { isDirectory: true, files: ['.athignore', '.gitignore', 'temp.bak', '.ath_materials'] }],
          ['/test/project/.ath_materials', { isDirectory: true, files: ['project_settings.json'] }],
        ]);
        const ignoreFiles = new Map([
          ['/test/project/.ath_materials/project_settings.json', '{}'],
          ['/test/project/.gitignore', '*.bak'],
          ['/test/project/.athignore', '*.log'], // No opinion on .bak files
        ]);
        setupFS(fileStructure, ignoreFiles);
        await ignoreRulesManager.loadIgnoreRules();
        
        expect(ignoreRulesManager.ignores('temp.bak')).toBe(true);
        expect(ignoreRulesManager.ignores('temp.log')).toBe(true);
      });
    });
  });

  describe('addIgnorePattern', () => {
    beforeEach(() => {
      // Restore the real addIgnorePattern method for these tests
      jest.restoreAllMocks();

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
      ).resolves.toBe(false); // addIgnorePattern now returns false on error
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
      const error = new Error('test error');
      try {
        (ignoreRulesManager as any).handleError(error, 'testing');
      } catch (e) {
        // expected
      }
      expect(ignoreRulesManager.getLastError()).toBe(error);
      ignoreRulesManager.clearError();
      expect(ignoreRulesManager.getLastError()).toBeNull();
    });
  });
});
