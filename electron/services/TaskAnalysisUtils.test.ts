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

    describe('example tag filtering', () => {
      it('should ignore content within <example> tags', () => {
        const result = extractKeywords('Process auth-utils, not this: <example>const x = 1; src/fake.js</example>. See also component.tsx.');
        expect(result).toEqual(['auth-utils', 'see', 'component.tsx']);
      });

      it('should ignore content within <examples> tags', () => {
        const result = extractKeywords('Process authentication <examples>function login() { return true; }</examples> system.');
        expect(result).toEqual(['authentication', 'system']);
      });

      it('should handle multiple example tags', () => {
        const result = extractKeywords('Fix <example>bad code</example> and <examples>more bad code</examples> in unique-module.');
        expect(result).toEqual(['unique-module']);
      });

      it('should handle mixed content with example tags', () => {
        const result = extractKeywords('Process FileService.ts <example>src/services/FileService.ts</example> with authentication.');
        expect(result).toEqual(['fileservice.ts', 'authentication']);
      });

      it('should work normally when no example tags are present', () => {
        const result = extractKeywords('Process FileService.ts with authentication.');
        expect(result).toEqual(['fileservice.ts', 'authentication']);
      });

      it('should ignore file paths within example tags', () => {
        const result = extractKeywords('Ignore path <example>src/services/FileService.ts</example>.');
        expect(result).toEqual([]);
      });

      it('should handle example tags with multiline content', () => {
        const result = extractKeywords(`Process authentication <example>
          function login() {
            return true;
          }
          const path = 'src/fake.js';
        </example> system.`);
        expect(result).toEqual(['authentication', 'system']);
      });

      it('should handle case-insensitive example tags', () => {
        const result = extractKeywords('Fix <EXAMPLE>bad code</EXAMPLE> and <Examples>more bad</Examples> in unique-module.');
        expect(result).toEqual(['unique-module']);
      });

      it('should demonstrate that example content would be included without filtering', () => {
        // This test shows what would happen if we didn't filter example tags
        const withoutFilter = extractKeywords('Process auth-utils, const x = 1; src/fake.js. See also component.tsx.');
        const withFilter = extractKeywords('Process auth-utils, <example>const x = 1; src/fake.js</example>. See also component.tsx.');
        
        expect(withoutFilter).toContain('src/fake.js');
        expect(withFilter).not.toContain('src/fake.js');
        expect(withFilter).toEqual(['auth-utils', 'see', 'component.tsx']);
      });
    });
  });
});
