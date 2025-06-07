// AI Summary: Unit tests for PathUtils covering path normalization, joining, resolution,
// and edge cases across different platform paths.

import { PathUtils } from './PathUtils';
import * as path from 'path';

describe('PathUtils', () => {
  // Store original platform to restore after tests
  const originalPlatform = process.platform;
  
  // Helper to simulate different platforms
  const mockPlatform = (platform: string) => {
    Object.defineProperty(process, 'platform', {
      value: platform
    });
  };

  // Restore original platform after all tests
  afterAll(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform
    });
  });

  describe('normalizeToUnix', () => {
    test('converts Windows backslashes to forward slashes', () => {
      expect(PathUtils.normalizeToUnix('C:\\Users\\test\\Documents')).toBe('C:/Users/test/Documents');
    });

    test('removes trailing slashes', () => {
      expect(PathUtils.normalizeToUnix('/home/user/')).toBe('/home/user');
      expect(PathUtils.normalizeToUnix('/home/user//')).toBe('/home/user');
      expect(PathUtils.normalizeToUnix('C:/Users/test//')).toBe('C:/Users/test');
    });

    test('preserves root slash', () => {
      expect(PathUtils.normalizeToUnix('/')).toBe('/');
      expect(PathUtils.normalizeToUnix('/')).not.toBe('');
    });

    test('handles empty input', () => {
      expect(PathUtils.normalizeToUnix('')).toBe('');
      expect(PathUtils.normalizeToUnix(null as unknown as string)).toBe('');
      expect(PathUtils.normalizeToUnix(undefined as unknown as string)).toBe('');
    });
  });

  describe('toPlatform', () => {
    test('converts Unix paths to Windows paths on Windows', () => {
      mockPlatform('win32');
      expect(PathUtils.toPlatform('/home/user/file.txt')).toBe('\\home\\user\\file.txt');
    });

    test('keeps Unix paths on Unix platforms', () => {
      mockPlatform('darwin');
      expect(PathUtils.toPlatform('/home/user/file.txt')).toBe('/home/user/file.txt');
      
      mockPlatform('linux');
      expect(PathUtils.toPlatform('/home/user/file.txt')).toBe('/home/user/file.txt');
    });

    test('handles empty input', () => {
      expect(PathUtils.toPlatform('')).toBe('');
      expect(PathUtils.toPlatform(null as unknown as string)).toBe('');
      expect(PathUtils.toPlatform(undefined as unknown as string)).toBe('');
    });
  });

  describe('joinUnix', () => {
    test('joins path segments with Unix separators', () => {
      expect(PathUtils.joinUnix('/home', 'user', 'file.txt')).toBe('/home/user/file.txt');
      expect(PathUtils.joinUnix('C:/Users', 'test', 'file.txt')).toBe('C:/Users/test/file.txt');
      expect(PathUtils.joinUnix('', 'user', 'file.txt')).toBe('user/file.txt');
    });

    test('normalizes paths while joining', () => {
      expect(PathUtils.joinUnix('/home/', '/user/', '/file.txt')).toBe('/home/user/file.txt');
      expect(PathUtils.joinUnix('C:\\Users\\', 'test')).toBe('C:/Users/test');
    });

    test('handles empty segments', () => {
      expect(PathUtils.joinUnix('', '')).toBe('');
      expect(PathUtils.joinUnix('', 'user', '')).toBe('user');
    });
  });

  describe('resolveUnix', () => {
    test('resolves to absolute Unix paths', () => {
      // Use the platform-specific path.resolve but normalize result
      const expected = PathUtils.normalizeToUnix(path.resolve('/home', 'user', 'file.txt'));
      expect(PathUtils.resolveUnix('/home', 'user', 'file.txt')).toBe(expected);
    });

    test('resolves relative path segments', () => {
      const expected = PathUtils.normalizeToUnix(path.resolve('/home/user', '../admin', './file.txt'));
      expect(PathUtils.resolveUnix('/home/user', '../admin', './file.txt')).toBe(expected);
    });
  });

  describe('relative', () => {
    test('calculates relative path between directories', () => {
      expect(PathUtils.relative('/home/user', '/home/user/docs')).toBe('docs');
      expect(PathUtils.relative('/home/user', '/home/admin')).toBe('../admin');
      expect(PathUtils.relative('/home/user/docs', '/home/user')).toBe('..');
    });

    test('works with mixed path formats', () => {
      expect(PathUtils.relative('C:\\Users\\test', 'C:\\Users\\test\\Documents')).toBe('Documents');
      expect(PathUtils.relative('/home/user', '/home/user\\docs')).toBe('docs');
    });

    test('returns empty string for identical paths', () => {
      expect(PathUtils.relative('/home/user', '/home/user')).toBe('');
      expect(PathUtils.relative('/home/user', '/home/user/')).toBe('');
    });

    test('handles empty inputs', () => {
      expect(PathUtils.relative('', '/home/user')).toBe('/home/user');
      expect(PathUtils.relative('/home/user', '')).toBe('');
      expect(PathUtils.relative('', '')).toBe('');
    });
  });

  describe('dirname', () => {
    test('returns parent directory path', () => {
      expect(PathUtils.dirname('/home/user/file.txt')).toBe('/home/user');
      expect(PathUtils.dirname('/home/user/')).toBe('/home');
      expect(PathUtils.dirname('file.txt')).toBe('');
    });

    test('handles Windows paths', () => {
      expect(PathUtils.dirname('C:\\Users\\test\\file.txt')).toBe('C:/Users/test');
    });

    test('handles empty inputs', () => {
      expect(PathUtils.dirname('')).toBe('');
    });
  });

  describe('basename', () => {
    test('returns file name from path', () => {
      expect(PathUtils.basename('/home/user/file.txt')).toBe('file.txt');
      expect(PathUtils.basename('/home/user/')).toBe('user');
      expect(PathUtils.basename('file.txt')).toBe('file.txt');
    });

    test('handles Windows paths', () => {
      expect(PathUtils.basename('C:\\Users\\test\\file.txt')).toBe('file.txt');
    });

    test('handles empty inputs', () => {
      expect(PathUtils.basename('')).toBe('');
    });
  });

  describe('extname', () => {
    test('returns file extension', () => {
      expect(PathUtils.extname('/home/user/file.txt')).toBe('.txt');
      expect(PathUtils.extname('image.jpg')).toBe('.jpg');
      expect(PathUtils.extname('archive.tar.gz')).toBe('.gz');
      expect(PathUtils.extname('/home/user/')).toBe('');
      expect(PathUtils.extname('file')).toBe('');
    });

    test('handles Windows paths', () => {
      expect(PathUtils.extname('C:\\Users\\test\\file.txt')).toBe('.txt');
    });

    test('handles empty inputs', () => {
      expect(PathUtils.extname('')).toBe('');
    });
  });

  describe('normalizeForIgnore', () => {
    test('adds trailing slash for directories', () => {
      expect(PathUtils.normalizeForIgnore('/home/user', true)).toBe('/home/user/');
      expect(PathUtils.normalizeForIgnore('/home/user/', true)).toBe('/home/user/');
    });

    test('removes trailing slash for files', () => {
      expect(PathUtils.normalizeForIgnore('/home/user/file.txt', false)).toBe('/home/user/file.txt');
      expect(PathUtils.normalizeForIgnore('/home/user/file.txt/', false)).toBe('/home/user/file.txt');
    });

    test('makes paths relative to base directory when provided', () => {
      expect(PathUtils.normalizeForIgnore('/home/user/file.txt', false, '/home')).toBe('user/file.txt');
      expect(PathUtils.normalizeForIgnore('/home/user', true, '/home')).toBe('user/');
    });

    test('returns null for paths outside base directory', () => {
      expect(PathUtils.normalizeForIgnore('/etc/config', false, '/home')).toBe(null);
      expect(PathUtils.normalizeForIgnore('../config', false, '/home')).toBe(null);
    });

    test('handles empty inputs', () => {
      expect(PathUtils.normalizeForIgnore('', false)).toBe(null);
      expect(PathUtils.normalizeForIgnore(null as unknown as string, true)).toBe(null);
    });
  });

  describe('ensureTrailingSlash', () => {
    test('adds trailing slash when missing', () => {
      expect(PathUtils.ensureTrailingSlash('/home/user')).toBe('/home/user/');
    });

    test('preserves existing trailing slash', () => {
      expect(PathUtils.ensureTrailingSlash('/home/user/')).toBe('/home/user/');
    });

    test('handles empty input', () => {
      expect(PathUtils.ensureTrailingSlash('')).toBe('/');
    });
  });

  describe('removeTrailingSlash', () => {
    test('removes trailing slash when present', () => {
      expect(PathUtils.removeTrailingSlash('/home/user/')).toBe('/home/user');
      expect(PathUtils.removeTrailingSlash('/home/user//')).toBe('/home/user');
    });

    test('preserves path without trailing slash', () => {
      expect(PathUtils.removeTrailingSlash('/home/user')).toBe('/home/user');
    });

    test('preserves root slash', () => {
      expect(PathUtils.removeTrailingSlash('/')).toBe('/');
    });

    test('handles empty input', () => {
      expect(PathUtils.removeTrailingSlash('')).toBe('');
    });
  });

  describe('isPathInside', () => {
    test('detects paths inside a parent directory', () => {
      expect(PathUtils.isPathInside('/home/user', '/home/user/docs')).toBe(true);
      expect(PathUtils.isPathInside('/home/user', '/home/user/docs/file.txt')).toBe(true);
    });

    test('handles trailing slashes correctly', () => {
      expect(PathUtils.isPathInside('/home/user/', '/home/user/docs')).toBe(true);
      expect(PathUtils.isPathInside('/home/user', '/home/user/')).toBe(true);
    });

    test('rejects paths not inside parent', () => {
      expect(PathUtils.isPathInside('/home/user', '/home/admin')).toBe(false);
      expect(PathUtils.isPathInside('/home/user', '/home')).toBe(false);
      expect(PathUtils.isPathInside('/home/user', '/home/users')).toBe(false);
    });

    test('handles same path', () => {
      expect(PathUtils.isPathInside('/home/user', '/home/user')).toBe(true);
    });

    test('handles empty inputs', () => {
      expect(PathUtils.isPathInside('', '/home/user')).toBe(false);
      expect(PathUtils.isPathInside('/home/user', '')).toBe(false);
    });
  });

  describe('getAncestors', () => {
    test('returns root for files in root directory', () => {
      expect(PathUtils.getAncestors('file.txt')).toEqual(['.']);
      expect(PathUtils.getAncestors('./file.txt')).toEqual(['.']);
    });

    test('returns ancestor directories for nested files', () => {
      expect(PathUtils.getAncestors('src/file.txt')).toEqual(['src', '.']);
      expect(PathUtils.getAncestors('src/components/Button.tsx')).toEqual(['src/components', 'src', '.']);
      expect(PathUtils.getAncestors('a/b/c/d/file.js')).toEqual(['a/b/c/d', 'a/b/c', 'a/b', 'a', '.']);
    });

    test('works with Windows-style paths', () => {
      expect(PathUtils.getAncestors('src\\components\\file.ts')).toEqual(['src/components', 'src', '.']);
    });

    test('handles trailing slashes correctly', () => {
      expect(PathUtils.getAncestors('src/components/')).toEqual(['src', '.']);
      expect(PathUtils.getAncestors('src/components/file.txt/')).toEqual(['src/components', 'src', '.']);
    });

    test('handles empty and invalid inputs', () => {
      expect(PathUtils.getAncestors('')).toEqual(['.']);
      expect(PathUtils.getAncestors(null as unknown as string)).toEqual(['.']);
      expect(PathUtils.getAncestors(undefined as unknown as string)).toEqual(['.']);
    });

    test('handles absolute paths', () => {
      expect(PathUtils.getAncestors('/home/user/file.txt')).toEqual(['/home/user', '/home', '.']);
      expect(PathUtils.getAncestors('C:/Users/test/file.txt')).toEqual(['C:/Users/test', 'C:/Users', 'C:', '.']);
    });

    test('handles single-level directories', () => {
      expect(PathUtils.getAncestors('src/')).toEqual(['.']);
      expect(PathUtils.getAncestors('docs/readme.md')).toEqual(['docs', '.']);
    });

    test('handles complex nested paths', () => {
      expect(PathUtils.getAncestors('projects/frontend/src/components/ui/Button/index.tsx'))
        .toEqual(['projects/frontend/src/components/ui/Button', 'projects/frontend/src/components/ui', 'projects/frontend/src/components', 'projects/frontend/src', 'projects/frontend', 'projects', '.']);
    });
  });

  describe('sanitizeFilename', () => {
    test('removes invalid characters', () => {
      expect(PathUtils.sanitizeFilename('file:name?.txt')).toBe('file_name_.txt');
      expect(PathUtils.sanitizeFilename('file/name\\test"<>|.txt')).toBe('file_name_test____.txt');
    });

    test('handles empty input', () => {
      expect(PathUtils.sanitizeFilename('')).toBe('');
      expect(PathUtils.sanitizeFilename(null as unknown as string)).toBe('');
    });
  });
});
