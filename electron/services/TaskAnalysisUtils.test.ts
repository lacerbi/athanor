// AI Summary: Unit tests for TaskAnalysisUtils keyword extraction and task analysis functionality.
// Tests both the deprecated extractKeywords function and the new analyzeTaskDescription function
// that separates path mentions from general keywords for hierarchical scoring.

import { extractKeywords, analyzeTaskDescription } from './TaskAnalysisUtils';

describe('TaskAnalysisUtils', () => {
  describe('analyzeTaskDescription', () => {
    it('should handle empty or null input', () => {
      expect(analyzeTaskDescription('')).toEqual({ pathMentions: new Set(), keywords: [] });
      expect(analyzeTaskDescription(null as any)).toEqual({ pathMentions: new Set(), keywords: [] });
      expect(analyzeTaskDescription(undefined as any)).toEqual({ pathMentions: new Set(), keywords: [] });
    });

    it('should separate path mentions from keywords', () => {
      const result = analyzeTaskDescription('Fix the authentication issue in src/auth/LoginService.ts');
      expect(Array.from(result.pathMentions)).toEqual(['src/auth/loginservice.ts']);
      expect(result.keywords).toEqual(['authentication']); // 'issue' is a stopword
    });

    it('should identify file extensions as path mentions', () => {
      const result = analyzeTaskDescription('Update component.tsx and styles.css files');
      expect(Array.from(result.pathMentions)).toEqual(['component.tsx', 'styles.css']);
      expect(result.keywords).toEqual([]); // 'update' and 'files' are stopwords
    });

    it('should identify paths with separators', () => {
      const result = analyzeTaskDescription('Check the config in src/utils/constants.ts and helpers/auth.js');
      expect(Array.from(result.pathMentions)).toEqual(['src/utils/constants.ts', 'helpers/auth.js']);
      expect(result.keywords).toEqual([]); // 'check', 'config' are stopwords
    });

    it('should normalize Windows-style paths', () => {
      const result = analyzeTaskDescription('Fix bug in electron\\services\\PathUtils.ts');
      expect(Array.from(result.pathMentions)).toEqual(['electron/services/pathutils.ts']);
      expect(result.keywords).toEqual([]);
    });

    it('should handle relative paths', () => {
      const result = analyzeTaskDescription('Go up to ../constants.ts and ./component.tsx');
      expect(Array.from(result.pathMentions)).toEqual(['../constants.ts', './component.tsx']);
      expect(result.keywords).toEqual([]);
    });

    it('should handle dot files as path mentions', () => {
      const result = analyzeTaskDescription('Check .gitignore and .prettierrc configuration');
      expect(Array.from(result.pathMentions)).toEqual(['.gitignore', '.prettierrc']);
      expect(result.keywords).toEqual([]); // 'check' and 'configuration' are stopwords
    });

    it('should filter keywords properly', () => {
      const result = analyzeTaskDescription('Refactor the authentication system and update documentation');
      expect(Array.from(result.pathMentions)).toEqual([]);
      expect(result.keywords).toEqual(['authentication', 'system']); // 'documentation' is a stopword
    });

    it('should handle mixed content with path mentions and keywords', () => {
      const result = analyzeTaskDescription('Implement validation logic in src/validators/UserValidator.ts for user registration');
      expect(Array.from(result.pathMentions)).toEqual(['src/validators/uservalidator.ts']);
      expect(result.keywords).toEqual(['validation', 'registration']); // 'logic', 'user' are stopwords
    });

    it('should remove trailing punctuation from tokens', () => {
      const result = analyzeTaskDescription('Update src/services/FileService.ts.');
      expect(Array.from(result.pathMentions)).toEqual(['src/services/fileservice.ts']);
      expect(result.keywords).toEqual([]);
    });

    it('should handle ellipsis tokens', () => {
      const result = analyzeTaskDescription('This is complex... check config.json');
      expect(Array.from(result.pathMentions)).toEqual(['config.json']);
      expect(result.keywords).toEqual(['complex']);
    });

    it('should filter out short words except allowed ones', () => {
      const result = analyzeTaskDescription('a new gui design for the cli app');
      expect(Array.from(result.pathMentions)).toEqual([]);
      expect(result.keywords).toEqual(['gui', 'design', 'cli']); // 'app' is a stopword
    });

    it('should remove content within example tags', () => {
      const result = analyzeTaskDescription('Process auth-utils, not this: <example>const x = 1; src/fake.js</example>. See also component.tsx.');
      expect(Array.from(result.pathMentions)).toEqual(['component.tsx']);
      expect(result.keywords).toEqual(['auth-utils']);
    });

    it('should handle multiple paths in one description', () => {
      const result = analyzeTaskDescription('Update src/components/Button.tsx, src/styles/button.css, and tests/Button.test.ts');
      expect(Array.from(result.pathMentions)).toEqual([
        'src/components/button.tsx',
        'src/styles/button.css',
        'tests/button.test.ts'
      ]);
      expect(result.keywords).toEqual([]);
    });

    it('should distinguish between standalone extensions and file paths', () => {
      const result = analyzeTaskDescription('Files with .ts extension like Component.ts should be updated');
      expect(Array.from(result.pathMentions)).toEqual(['component.ts']); // .ts is filtered out as pure extension
      expect(result.keywords).toEqual(['extension', 'updated']); // 'should' is a stopword
    });

    it('should return unique path mentions', () => {
      const result = analyzeTaskDescription('Check src/utils/helper.ts and src/utils/helper.ts again');
      expect(Array.from(result.pathMentions)).toEqual(['src/utils/helper.ts']);
      expect(result.keywords).toEqual([]);
    });
  });

  describe('extractKeywords (deprecated)', () => {
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
        expect(result).toEqual(['auth-utils', 'component.tsx']);
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
        expect(result).toEqual(['authentication', 'fileservice.ts']); // Order may vary due to Set operations
      });

      it('should work normally when no example tags are present', () => {
        const result = extractKeywords('Process FileService.ts with authentication.');
        expect(result).toEqual(['authentication', 'fileservice.ts']); // Order may vary due to Set operations
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
        expect(withFilter).toEqual(['auth-utils', 'component.tsx']);
      });
    });

    describe('new filter rules', () => {
      it('should preserve allowed short words like "gui" or "cli"', () => {
        const result = extractKeywords('Implement new gui design for the cli');
        expect(result).toEqual(['gui', 'design', 'cli']); // 'new' is short and not allowed
      });

      it('should filter short, non-allowed words', () => {
        const result = extractKeywords('a new car to fix the bug'); // Most are short or stopwords
        expect(result).toEqual([]);
      });

      it('should include standalone file extensions in combined results', () => {
        const result = extractKeywords('check the .json and .md files');
        expect(result).toEqual([]); // Pure extensions are now filtered out completely
      });

      it('should not filter full file names with extensions', () => {
        const result = extractKeywords('check config.json file');
        expect(result).toEqual(['config.json']);
      });

      it('should not filter dot-files', () => {
        const result = extractKeywords('update the .gitignore and .prettierrc');
        expect(result).toEqual(['.gitignore', '.prettierrc']);
      });
    });
  });
});
