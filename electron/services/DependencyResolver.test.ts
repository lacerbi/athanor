// AI Summary: Unit tests for the DependencyResolver service.
// Validates Python absolute/relative import resolution and JavaScript/TypeScript resolution
// with comprehensive mock FileService setup and edge case coverage.

import { DependencyResolver } from './DependencyResolver';
import { FileService } from './FileService';

// Mock FileService
jest.mock('./FileService');

describe('DependencyResolver', () => {
  let mockFileService: jest.Mocked<FileService>;

  beforeEach(() => {
    // Create a mock FileService instance
    mockFileService = {
      exists: jest.fn(),
      isDirectory: jest.fn(),
    } as any;

    // Set up a mock file system representing a sample Python/JS project
    const mockFileSystem = new Set([
      // Python files
      'my_app/main.py',
      'my_app/utils.py',
      'my_app/models.py',
      'my_app/services/__init__.py',
      'my_app/services/api.py',
      'my_app/services/database.py',
      'my_app/config/__init__.py',
      'my_app/config/settings.py',
      'tests/test_main.py',
      'tests/helpers.py',
      'shared/common.py',
      
      // JavaScript/TypeScript files
      'src/components/Button.tsx',
      'src/components/index.ts',
      'src/utils/helpers.js',
      'src/utils/api.ts',
      'src/hooks/useAuth.ts',
      'lib/constants.json',
    ]);

    // Mock exists method
    mockFileService.exists.mockImplementation(async (path: string) => {
      return mockFileSystem.has(path);
    });

    // Mock isDirectory method
    mockFileService.isDirectory.mockImplementation(async (path: string) => {
      // Directories are paths that end with __init__.py when we remove that part
      if (path.includes('/__init__.py')) return false;
      
      // Check if there are files that start with this path + /
      const pathWithSlash = path + '/';
      for (const file of mockFileSystem) {
        if (file.startsWith(pathWithSlash)) {
          return true;
        }
      }
      return false;
    });
  });

  describe('Python Dependency Resolution', () => {
    describe('Absolute Imports', () => {
      it('should resolve absolute import to a .py file', async () => {
        const result = await DependencyResolver.resolve(
          'my_app/main.py',
          'my_app.utils',
          mockFileService
        );
        expect(result).toBe('my_app/utils.py');
      });

      it('should resolve absolute import to a package (__init__.py)', async () => {
        const result = await DependencyResolver.resolve(
          'my_app/main.py',
          'my_app.services',
          mockFileService
        );
        expect(result).toBe('my_app/services/__init__.py');
      });

      it('should resolve nested package import', async () => {
        const result = await DependencyResolver.resolve(
          'my_app/main.py',
          'my_app.config.settings',
          mockFileService
        );
        expect(result).toBe('my_app/config/settings.py');
      });

      it('should return null for unresolvable absolute import', async () => {
        const result = await DependencyResolver.resolve(
          'my_app/main.py',
          'nonexistent.module',
          mockFileService
        );
        expect(result).toBeNull();
      });
    });

    describe('Relative Imports', () => {
      it('should resolve same-level relative import', async () => {
        const result = await DependencyResolver.resolve(
          'my_app/main.py',
          '.utils',
          mockFileService
        );
        expect(result).toBe('my_app/utils.py');
      });

      it('should resolve current package import (from .)', async () => {
        const result = await DependencyResolver.resolve(
          'my_app/services/api.py',
          '.',
          mockFileService
        );
        expect(result).toBe('my_app/services/__init__.py');
      });

      it('should resolve parent package import (from ..)', async () => {
        const result = await DependencyResolver.resolve(
          'my_app/services/api.py',
          '..utils',
          mockFileService
        );
        expect(result).toBe('my_app/utils.py');
      });

      it('should resolve grandparent package import (from ...)', async () => {
        const result = await DependencyResolver.resolve(
          'my_app/services/api.py',
          '...shared.common',
          mockFileService
        );
        expect(result).toBe('shared/common.py');
      });

      it('should resolve sibling package import', async () => {
        const result = await DependencyResolver.resolve(
          'my_app/services/api.py',
          '..config.settings',
          mockFileService
        );
        expect(result).toBe('my_app/config/settings.py');
      });

      it('should return null for unresolvable relative import', async () => {
        const result = await DependencyResolver.resolve(
          'my_app/main.py',
          '.nonexistent',
          mockFileService
        );
        expect(result).toBeNull();
      });

      it('should return null when going up too many levels', async () => {
        const result = await DependencyResolver.resolve(
          'my_app/main.py',
          '....something',
          mockFileService
        );
        expect(result).toBeNull();
      });
    });
  });

  describe('JavaScript/TypeScript Dependency Resolution', () => {
    it('should resolve relative import with extension', async () => {
      const result = await DependencyResolver.resolve(
        'src/components/Button.tsx',
        './index',
        mockFileService
      );
      expect(result).toBe('src/components/index.ts');
    });

    it('should resolve parent directory import', async () => {
      const result = await DependencyResolver.resolve(
        'src/components/Button.tsx',
        '../utils/helpers',
        mockFileService
      );
      expect(result).toBe('src/utils/helpers.js');
    });

    it('should resolve JSON import', async () => {
      const result = await DependencyResolver.resolve(
        'src/components/Button.tsx',
        '../../lib/constants',
        mockFileService
      );
      expect(result).toBe('lib/constants.json');
    });

    it('should return null for non-relative imports (node_modules)', async () => {
      const result = await DependencyResolver.resolve(
        'src/components/Button.tsx',
        'react',
        mockFileService
      );
      expect(result).toBeNull();
    });

    it('should return null for unresolvable relative import', async () => {
      const result = await DependencyResolver.resolve(
        'src/components/Button.tsx',
        './nonexistent',
        mockFileService
      );
      expect(result).toBeNull();
    });
  });

  describe('Language Detection', () => {
    it('should use Python resolution for .py files', async () => {
      const result = await DependencyResolver.resolve(
        'my_app/main.py',
        'my_app.utils',
        mockFileService
      );
      expect(result).toBe('my_app/utils.py');
    });

    it('should use JavaScript resolution for .ts files', async () => {
      const result = await DependencyResolver.resolve(
        'src/components/Button.tsx',
        './index',
        mockFileService
      );
      expect(result).toBe('src/components/index.ts');
    });

    it('should use JavaScript resolution for .js files', async () => {
      const result = await DependencyResolver.resolve(
        'src/utils/helpers.js',
        '../hooks/useAuth',
        mockFileService
      );
      expect(result).toBe('src/hooks/useAuth.ts');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty specifier', async () => {
      const result = await DependencyResolver.resolve(
        'my_app/main.py',
        '',
        mockFileService
      );
      expect(result).toBeNull();
    });

    it('should handle specifier with only dots', async () => {
      const result = await DependencyResolver.resolve(
        'my_app/main.py',
        '...',
        mockFileService
      );
      expect(result).toBeNull();
    });

    it('should handle file system errors gracefully', async () => {
      // Mock FileService to throw an error
      mockFileService.exists.mockRejectedValueOnce(new Error('File system error'));
      
      const result = await DependencyResolver.resolve(
        'my_app/main.py',
        'my_app.utils',
        mockFileService
      );
      expect(result).toBeNull();
    });
  });
});
