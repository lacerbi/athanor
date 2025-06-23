// AI Summary: Comprehensive tests for file operation utilities including diff parsing,
// line ending normalization, and file update processing. Tests the fix for decorative comment parsing.
import {
  parseDiffBlocks,
  normalizeLineEndings,
  removeInitialEmptyLine,
  processFileUpdate,
} from './fileOperations';

describe('fileOperations', () => {
  describe('parseDiffBlocks', () => {
    it('should parse a simple diff block', () => {
      const content = `<<<<<<< SEARCH
old content
=======
new content
>>>>>>> REPLACE`;

      const blocks = parseDiffBlocks(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].search).toBe('old content');
      expect(blocks[0].replace).toBe('new content');
    });

    it('should parse multiple diff blocks', () => {
      const content = `<<<<<<< SEARCH
first old
=======
first new
>>>>>>> REPLACE
<<<<<<< SEARCH
second old
=======
second new
>>>>>>> REPLACE`;

      const blocks = parseDiffBlocks(content);

      expect(blocks).toHaveLength(2);
      expect(blocks[0].search).toBe('first old');
      expect(blocks[0].replace).toBe('first new');
      expect(blocks[1].search).toBe('second old');
      expect(blocks[1].replace).toBe('second new');
    });

    it('should handle optional punctuation after SEARCH and REPLACE keywords', () => {
      const content = `<<<<<<< SEARCH?
old content
=======
new content
>>>>>>> REPLACE!`;

      const blocks = parseDiffBlocks(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].search).toBe('old content');
      expect(blocks[0].replace).toBe('new content');
    });

    it('should handle multiline content with proper separator', () => {
      const content = `<<<<<<< SEARCH
function oldFunction() {
  return 'old';
}
=======
function newFunction() {
  return 'new';
}
>>>>>>> REPLACE`;

      const blocks = parseDiffBlocks(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].search).toBe(`function oldFunction() {
  return 'old';
}`);
      expect(blocks[0].replace).toBe(`function newFunction() {
  return 'new';
}`);
    });

    it('should NOT confuse decorative comments with the separator', () => {
      const content = `<<<<<<< SEARCH
//========================================
// Section Header  
//========================================
function oldFunction() {
  return 'old';
}
=======
//========================================
// Updated Section Header  
//========================================
function newFunction() {
  return 'new';
}
>>>>>>> REPLACE`;

      const blocks = parseDiffBlocks(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].search).toBe(`//========================================
// Section Header  
//========================================
function oldFunction() {
  return 'old';
}`);
      expect(blocks[0].replace).toBe(`//========================================
// Updated Section Header  
//========================================
function newFunction() {
  return 'new';
}`);
    });

    it('should handle content with equals signs in code', () => {
      const content = `<<<<<<< SEARCH
const result = a === b && c === d;
if (x === 7) {
  return true;
}
=======
const result = a === b && c === d && e === f;
if (x === 7) {
  return true;
}
>>>>>>> REPLACE`;

      const blocks = parseDiffBlocks(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].search).toBe(`const result = a === b && c === d;
if (x === 7) {
  return true;
}`);
      expect(blocks[0].replace)
        .toBe(`const result = a === b && c === d && e === f;
if (x === 7) {
  return true;
}`);
    });

    it('should handle content with multiple types of decorative elements', () => {
      const content = `<<<<<<< SEARCH
/* ================================== */
// Another header: ==================
const SEPARATOR = "=======";
const config = {
  divider: "================"
};
=======
/* ================================== */
// Updated header: ==================
const SEPARATOR = "=======";
const config = {
  divider: "================",
  newOption: true
};
>>>>>>> REPLACE`;

      const blocks = parseDiffBlocks(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].search).toBe(`/* ================================== */
// Another header: ==================
const SEPARATOR = "=======";
const config = {
  divider: "================"
};`);
      expect(blocks[0].replace).toBe(`/* ================================== */
// Updated header: ==================
const SEPARATOR = "=======";
const config = {
  divider: "================",
  newOption: true
};`);
    });

    it('should throw error for empty search block', () => {
      const content = `<<<<<<< SEARCH
   
=======
new content
>>>>>>> REPLACE`;

      expect(() => parseDiffBlocks(content)).toThrow(
        'Search block cannot be empty'
      );
    });

    it('should throw error when no diff blocks found', () => {
      const content = 'This is just regular content';

      expect(() => parseDiffBlocks(content)).toThrow(
        'No valid diff blocks found in content'
      );
    });

    it('should handle empty replace block', () => {
      const content = `<<<<<<< SEARCH
content to remove
=======
>>>>>>> REPLACE`;

      const blocks = parseDiffBlocks(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].search).toBe('content to remove');
      expect(blocks[0].replace).toBe('');
    });
  });

  describe('removeInitialEmptyLine', () => {
    it('should remove single initial newline', () => {
      const content = '\nHello world';
      expect(removeInitialEmptyLine(content)).toBe('Hello world');
    });

    it('should not remove initial line with whitespace', () => {
      const content = '\n Hello world';
      expect(removeInitialEmptyLine(content)).toBe('\n Hello world');
    });

    it('should not remove initial line with tab', () => {
      const content = '\n\tHello world';
      expect(removeInitialEmptyLine(content)).toBe('\n\tHello world');
    });

    it('should not modify content without initial newline', () => {
      const content = 'Hello world';
      expect(removeInitialEmptyLine(content)).toBe('Hello world');
    });

    it('should handle empty string', () => {
      expect(removeInitialEmptyLine('')).toBe('');
    });
  });

  describe('normalizeLineEndings', () => {
    it('should convert Windows line endings to Unix', () => {
      const content = 'line1\r\nline2\r\nline3';
      expect(normalizeLineEndings(content)).toBe('line1\nline2\nline3');
    });

    it('should convert old Mac line endings to Unix', () => {
      const content = 'line1\rline2\rline3';
      expect(normalizeLineEndings(content)).toBe('line1\nline2\nline3');
    });

    it('should replace non-breaking spaces with regular spaces', () => {
      const content = 'Hello\u00A0world';
      expect(normalizeLineEndings(content)).toBe('Hello world');
    });

    it('should remove initial empty line after normalization', () => {
      const content = '\r\nHello world';
      expect(normalizeLineEndings(content)).toBe('Hello world');
    });

    it('should handle empty string', () => {
      expect(normalizeLineEndings('')).toBe('');
    });

    it('should handle mixed line endings', () => {
      const content = 'line1\r\nline2\rline3\nline4';
      expect(normalizeLineEndings(content)).toBe('line1\nline2\nline3\nline4');
    });
  });

  describe('processFileUpdate', () => {
    it('should return normalized content for UPDATE_FULL operation', async () => {
      const result = await processFileUpdate(
        'UPDATE_FULL',
        'test.txt',
        'new content\r\n',
        'old content',
        'fuzzy'
      );

      expect(result).toBe('new content\n');
    });

    it('should apply diff blocks for UPDATE_DIFF operation', async () => {
      const diffContent = `<<<<<<< SEARCH
old line
=======
new line
>>>>>>> REPLACE`;

      const currentContent = 'old line\nother content';

      const result = await processFileUpdate(
        'UPDATE_DIFF',
        'test.txt',
        diffContent,
        currentContent,
        'fuzzy'
      );

      expect(result).toBe('new line\nother content');
    });

    it('should handle UPDATE_DIFF with decorative comments', async () => {
      const diffContent = `<<<<<<< SEARCH
//=====================================
// Old Section
//=====================================
function oldFunc() {
  return 'old';
}
=======
//=====================================
// New Section
//=====================================
function newFunc() {
  return 'new';
}
>>>>>>> REPLACE`;

      const currentContent = `//=====================================
// Old Section
//=====================================
function oldFunc() {
  return 'old';
}
other content`;

      const result = await processFileUpdate(
        'UPDATE_DIFF',
        'test.js',
        diffContent,
        currentContent,
        'fuzzy'
      );

      expect(result).toBe(`//=====================================
// New Section
//=====================================
function newFunc() {
  return 'new';
}
other content`);
    });

    it('should throw error in strict mode when exact match fails', async () => {
      const diffContent = `<<<<<<< SEARCH
exact content
=======
new content
>>>>>>> REPLACE`;

      const currentContent = 'different content';

      await expect(
        processFileUpdate(
          'UPDATE_DIFF',
          'test.txt',
          diffContent,
          currentContent,
          'strict'
        )
      ).rejects.toThrow('Strict matching failed');
    });
  });
});
