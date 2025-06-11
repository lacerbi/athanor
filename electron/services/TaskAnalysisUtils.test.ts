// AI Summary: Unit tests for TaskAnalysisUtils keyword extraction functionality.
// Tests file path handling, punctuation removal, and various edge cases.

import { extractKeywords } from './TaskAnalysisUtils';

describe('TaskAnalysisUtils', () => {
  describe('extractKeywords', () => {
    it('should handle empty or null input', () => {
      expect(extractKeywords('')).toEqual([]);
      expect(extractKeywords(null as any)).toEqual([]);
      expect(extractKeywords(undefined as any)).toEqual([]);
    });

    it('should extract basic keywords', () => {
      const result = extractKeywords('This is a simple test');
      expect(result).toEqual(['simple', 'test']);
    });

    it('should filter stop words', () => {
      const result = extractKeywords('fix update change add remove implement refactor style');
      expect(result).toEqual([]);
    });

    it('should handle file paths with trailing dot', () => {
      const result = extractKeywords('Please update the file src/services/FileService.ts.');
      expect(result).toContain('src/services/fileservice.ts');
      expect(result).toContain('please');
      expect(result).toContain('file');
    });

    it('should normalize Windows-style paths', () => {
      const result = extractKeywords('Fix bug in electron\\services\\PathUtils.ts');
      expect(result).toContain('electron/services/pathutils.ts');
    });

    it('should handle ellipsis tokens', () => {
      const result = extractKeywords('This is complex...');
      expect(result).toEqual(['complex']);
      expect(result).not.toContain('...');
    });

    it('should preserve leading dot files', () => {
      const result = extractKeywords('Check .gitignore file');
      expect(result).toContain('.gitignore');
      expect(result).toContain('check');
      expect(result).toContain('file');
    });

    it('should handle relative paths with double dots', () => {
      const result = extractKeywords('Go up to ../constants.ts');
      expect(result).toContain('../constants.ts');
    });

    it('should handle multiple file extensions', () => {
      const result = extractKeywords('Update component.tsx and styles.css files');
      expect(result).toContain('component.tsx');
      expect(result).toContain('styles.css');
      expect(result).toContain('files');
    });

    it('should handle snake_case and kebab-case identifiers', () => {
      const result = extractKeywords('Fix file_service and auth-utils modules');
      expect(result).toContain('file_service');
      expect(result).toContain('auth-utils');
      expect(result).toContain('modules');
    });

    it('should filter out short words', () => {
      const result = extractKeywords('a an to is in it of for on');
      expect(result).toEqual([]);
    });

    it('should return unique keywords', () => {
      const result = extractKeywords('test file test file component component');
      expect(result).toEqual(['test', 'file', 'component']);
    });

    it('should handle complex task descriptions', () => {
      const result = extractKeywords('Refactor the authentication system in src/auth/LoginService.ts and update the related tests in tests/auth/LoginService.test.ts.');
      expect(result).toContain('authentication');
      expect(result).toContain('system');
      expect(result).toContain('src/auth/loginservice.ts');
      expect(result).toContain('tests');
      expect(result).toContain('related');
      expect(result).toContain('tests/auth/loginservice.test.ts');
      // Note: 'refactor' and 'update' are filtered as stop words
    });
  });
});
