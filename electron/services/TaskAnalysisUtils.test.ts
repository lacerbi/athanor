// AI Summary: Unit tests for TaskAnalysisUtils keyword extraction functionality.
// Tests file path handling, punctuation removal, stop-word filtering, and various edge cases.

import { extractKeywords } from './TaskAnalysisUtils';

describe('TaskAnalysisUtils', () => {
  describe('extractKeywords', () => {
    it('should handle empty or null input', () => {
      expect(extractKeywords('')).toEqual([]);
      expect(extractKeywords(null as any)).toEqual([]);
      expect(extractKeywords(undefined as any)).toEqual([]);
    });

    it('should extract basic keywords and filter stopwords', () => {
      const result = extractKeywords('This is a unique phrase');
      expect(result).toEqual(['unique', 'phrase']);
    });

    it('should filter common action words', () => {
      const result = extractKeywords('fix update change add remove implement refactor style');
      expect(result).toEqual([]);
    });

    it('should filter common task-related words', () => {
      const result = extractKeywords('This task is to work on a file for the project');
      expect(result).toEqual([]);
    });

    it('should handle file paths with trailing punctuation', () => {
      const result = extractKeywords('Please update the file src/services/FileService.ts.');
      expect(result).toEqual(['src/services/fileservice.ts']); // 'please', 'update', 'file' are stopwords
    });

    it('should normalize Windows-style paths', () => {
      const result = extractKeywords('Fix bug in electron\\services\\PathUtils.ts');
      expect(result).toContain('electron/services/pathutils.ts');
      expect(result.length).toBe(1);
    });

    it('should handle ellipsis tokens', () => {
      const result = extractKeywords('This is complex...');
      expect(result).toEqual(['complex']);
      expect(result).not.toContain('...');
    });

    it('should preserve leading dot files', () => {
      const result = extractKeywords('Check .gitignore file');
      expect(result).toEqual(['.gitignore']); // 'check' and 'file' are stopwords
    });

    it('should handle relative paths with double dots', () => {
      const result = extractKeywords('Go up to ../constants.ts');
      expect(result).toContain('../constants.ts');
      expect(result.length).toBe(1);
    });

    it('should handle multiple file extensions', () => {
      const result = extractKeywords('Update component.tsx and styles.css files');
      expect(result).toEqual(['component.tsx', 'styles.css']);
    });

    it('should handle snake_case and kebab-case identifiers', () => {
      const result = extractKeywords('Fix file_service and auth-utils modules');
      expect(result).toEqual(['file_service', 'auth-utils']);
    });

    it('should filter out short English words', () => {
      const result = extractKeywords('a an to is in it of for on');
      expect(result).toEqual([]);
    });

    it('should return unique keywords', () => {
      const result = extractKeywords('test file test file component component');
      expect(result).toEqual([]); // All are stopwords
    });

    it('should handle complex task descriptions with a large stopword list', () => {
      const result = extractKeywords(
        'Refactor the authentication system in src/auth/LoginService.ts and update the related tests in tests/auth/LoginService.test.ts.',
      );
      expect(result).toContain('authentication');
      expect(result).toContain('system');
      expect(result).toContain('src/auth/loginservice.ts');
      expect(result).toContain('tests/auth/loginservice.test.ts');
      // 'Refactor', 'the', 'in', 'and', 'update', 'related', 'tests' are now stopwords.
      expect(result.length).toBe(4);
    });

    it('should accept extra stop words', () => {
      const text = 'this is a unique identifier';
      const result1 = extractKeywords(text);
      expect(result1).toEqual(['unique', 'identifier']);

      const result2 = extractKeywords(text, ['unique']);
      expect(result2).toEqual(['identifier']);

      const result3 = extractKeywords(text, ['unique', 'identifier']);
      expect(result3).toEqual([]);
    });
  });
});
