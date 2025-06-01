/**
 * @jest-environment jsdom
 */
// AI Summary: Comprehensive unit tests for ManualCopyAction covering all exported functions.
// Tests include happy paths, edge cases, error handling, and proper mocking of dependencies.
import {
  copySelectedFilesContent,
  copyFailedDiffContent,
  copyToClipboard,
  CopyParams,
  CopySelectedParams,
  CopyFailedDiffParams,
} from './ManualCopyAction';
import { useFileSystemStore } from '../stores/fileSystemStore';
import * as tokenCountUtils from '../utils/tokenCount';
import * as codebaseDocumentationUtils from '../utils/codebaseDocumentation';
import { DOC_FORMAT } from '../utils/constants';

// Mock the external dependencies
jest.mock('../stores/fileSystemStore', () => ({
  useFileSystemStore: {
    getState: jest.fn(),
  },
}));

jest.mock('../utils/tokenCount');
jest.mock('../utils/codebaseDocumentation');

// Mock navigator.clipboard
const mockClipboardWriteText = jest.fn();
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: mockClipboardWriteText },
  writable: true,
});

// Mock window.fileSystem (Electron IPC)
const mockWindowFsReadFile = jest.fn();
if (typeof window === 'undefined') {
  (global as any).window = {};
}
(window as any).fileSystem = {
  ...((window as any).fileSystem || {}),
  readFile: mockWindowFsReadFile,
};

// Mock console.error to avoid noise in test output
let consoleErrorSpy: jest.SpyInstance;

describe('ManualCopyAction', () => {
  let mockAddLog: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddLog = jest.fn();

    // Default mock implementations
    (useFileSystemStore.getState as jest.Mock).mockReturnValue({
      selectedItems: new Set(['file1.ts', 'file2.js']),
      fileTree: [],
      smartPreviewEnabled: true,
      formatType: DOC_FORMAT.XML,
    });

    (tokenCountUtils.countTokens as jest.Mock).mockReturnValue(150);
    (tokenCountUtils.formatTokenCount as jest.Mock).mockImplementation(
      (count) => `~${count} tokens`
    );

    (codebaseDocumentationUtils.generateCodebaseDocumentation as jest.Mock).mockResolvedValue({
      file_contents: 'mocked file contents\nwith multiple lines',
      file_tree: '<file_tree>mock tree</file_tree>',
    });

    (codebaseDocumentationUtils.formatSingleFile as jest.Mock).mockImplementation(
      (filePath, content, rootPath, isSelected, formatType) =>
        `# ${filePath}\n\`\`\`\n${content}\n\`\`\``
    );

    mockClipboardWriteText.mockResolvedValue(undefined);
    mockWindowFsReadFile.mockResolvedValue('mocked file content from readFile');

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (consoleErrorSpy) {
      consoleErrorSpy.mockRestore();
    }
  });

  describe('normalizeContent (internal function)', () => {
    // Since normalizeContent is not exported, we'll test it indirectly through copyToClipboard
    it('should normalize line endings when copying content', async () => {
      const params: CopyParams = {
        content: 'line1\r\nline2\rline3\nline4',
        addLog: mockAddLog,
      };

      await copyToClipboard(params);

      expect(mockClipboardWriteText).toHaveBeenCalledWith('line1\nline2\nline3\nline4');
    });

    it('should handle empty content', async () => {
      const params: CopyParams = {
        content: '',
        addLog: mockAddLog,
      };

      await copyToClipboard(params);

      expect(mockClipboardWriteText).toHaveBeenCalledWith('');
    });

    it('should handle content with no line endings', async () => {
      const params: CopyParams = {
        content: 'single line content',
        addLog: mockAddLog,
      };

      await copyToClipboard(params);

      expect(mockClipboardWriteText).toHaveBeenCalledWith('single line content');
    });
  });

  describe('copyToClipboard', () => {
    it('should copy basic content and log success', async () => {
      const params: CopyParams = {
        content: 'test content',
        addLog: mockAddLog,
      };

      await copyToClipboard(params);

      expect(mockClipboardWriteText).toHaveBeenCalledWith('test content');
      expect(tokenCountUtils.countTokens).toHaveBeenCalledWith('test content');
      expect(tokenCountUtils.formatTokenCount).toHaveBeenCalledWith(150);
      expect(mockAddLog).toHaveBeenCalledWith('Content copied to clipboard (~150 tokens)');
    });

    it('should format content using formatSingleFile if filePath is provided', async () => {
      const params: CopyParams = {
        content: 'const x = 1;',
        addLog: mockAddLog,
        filePath: 'src/test.js',
        rootPath: '/project',
      };

      await copyToClipboard(params);

      expect(codebaseDocumentationUtils.formatSingleFile).toHaveBeenCalledWith(
        'src/test.js',
        'const x = 1;',
        '/project',
        false,
        DOC_FORMAT.XML
      );
      expect(mockClipboardWriteText).toHaveBeenCalledWith('# src/test.js\n```\nconst x = 1;\n```');
    });

    it('should use provided formatType', async () => {
      const params: CopyParams = {
        content: 'const x = 1;',
        addLog: mockAddLog,
        filePath: 'src/test.js',
        formatType: DOC_FORMAT.MARKDOWN,
      };

      await copyToClipboard(params);

      expect(codebaseDocumentationUtils.formatSingleFile).toHaveBeenCalledWith(
        'src/test.js',
        'const x = 1;',
        undefined,
        false,
        DOC_FORMAT.MARKDOWN
      );
    });

    it('should use formatType from store if not provided in params', async () => {
      (useFileSystemStore.getState as jest.Mock).mockReturnValue({
        formatType: DOC_FORMAT.MARKDOWN,
      });

      const params: CopyParams = {
        content: 'const x = 1;',
        addLog: mockAddLog,
        filePath: 'src/test.js',
      };

      await copyToClipboard(params);

      expect(codebaseDocumentationUtils.formatSingleFile).toHaveBeenCalledWith(
        'src/test.js',
        'const x = 1;',
        undefined,
        false,
        DOC_FORMAT.MARKDOWN
      );
    });

    it('should log "Formatted content" if isFormatted is true', async () => {
      const params: CopyParams = {
        content: 'test content',
        addLog: mockAddLog,
        isFormatted: true,
      };

      await copyToClipboard(params);

      expect(mockAddLog).toHaveBeenCalledWith('Formatted content copied to clipboard (~150 tokens)');
    });

    it('should handle filePath provided but empty content', async () => {
      const params: CopyParams = {
        content: '',
        addLog: mockAddLog,
        filePath: 'src/empty.js',
      };

      await copyToClipboard(params);

      expect(codebaseDocumentationUtils.formatSingleFile).toHaveBeenCalledWith(
        'src/empty.js',
        '',
        undefined,
        false,
        DOC_FORMAT.XML
      );
    });

    it('should log error if clipboard.writeText fails', async () => {
      const clipboardError = new Error('Clipboard access denied');
      mockClipboardWriteText.mockRejectedValue(clipboardError);

      const params: CopyParams = {
        content: 'test content',
        addLog: mockAddLog,
      };

      await copyToClipboard(params);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to copy text:', clipboardError);
      expect(mockAddLog).toHaveBeenCalledWith('Failed to copy to clipboard');
    });

    it('should handle mixed line endings properly', async () => {
      const params: CopyParams = {
        content: 'line1\r\nline2\rline3\nline4',
        addLog: mockAddLog,
      };

      await copyToClipboard(params);

      expect(mockClipboardWriteText).toHaveBeenCalledWith('line1\nline2\nline3\nline4');
    });
  });

  describe('copySelectedFilesContent', () => {
    it('should generate documentation and copy to clipboard', async () => {
      const params: CopySelectedParams = {
        addLog: mockAddLog,
        rootPath: '/project/root',
      };

      await copySelectedFilesContent(params);

      expect(codebaseDocumentationUtils.generateCodebaseDocumentation).toHaveBeenCalledWith(
        [], // fileTree from store
        new Set(['file1.ts', 'file2.js']), // selectedItems from store
        '/project/root',
        null,
        false, // Always exclude non-selected files for manual copy
        DOC_FORMAT.XML // formatType from store
      );
      expect(mockClipboardWriteText).toHaveBeenCalledWith('mocked file contents\nwith multiple lines');
      expect(tokenCountUtils.countTokens).toHaveBeenCalledWith('mocked file contents\nwith multiple lines');
      expect(mockAddLog).toHaveBeenCalledWith('Copied 2 files to clipboard (~150 tokens)');
    });

    it('should always exclude non-selected files regardless of smartPreviewEnabled setting', async () => {
      (useFileSystemStore.getState as jest.Mock).mockReturnValue({
        selectedItems: new Set(['single.ts']),
        fileTree: [{ id: '1', name: 'test', type: 'file' }],
        smartPreviewEnabled: true, // Even when smart preview is enabled
        formatType: DOC_FORMAT.MARKDOWN,
      });

      const params: CopySelectedParams = {
        addLog: mockAddLog,
        rootPath: '/project',
      };

      await copySelectedFilesContent(params);

      expect(codebaseDocumentationUtils.generateCodebaseDocumentation).toHaveBeenCalledWith(
        [{ id: '1', name: 'test', type: 'file' }],
        new Set(['single.ts']),
        '/project',
        null,
        false, // Always false, ignoring smartPreviewEnabled setting
        DOC_FORMAT.MARKDOWN // formatType = MARKDOWN
      );
    });

    it('should log "No files selected" if generateCodebaseDocumentation returns no file_contents', async () => {
      (codebaseDocumentationUtils.generateCodebaseDocumentation as jest.Mock).mockResolvedValue({
        file_contents: '',
        file_tree: '<file_tree>empty</file_tree>',
      });

      const params: CopySelectedParams = {
        addLog: mockAddLog,
        rootPath: '/project',
      };

      await copySelectedFilesContent(params);

      expect(mockAddLog).toHaveBeenCalledWith('No files selected to copy');
      expect(mockClipboardWriteText).not.toHaveBeenCalled();
    });

    it('should log "No files selected" if generateCodebaseDocumentation returns null file_contents', async () => {
      (codebaseDocumentationUtils.generateCodebaseDocumentation as jest.Mock).mockResolvedValue({
        file_contents: null,
        file_tree: '<file_tree>empty</file_tree>',
      });

      const params: CopySelectedParams = {
        addLog: mockAddLog,
        rootPath: '/project',
      };

      await copySelectedFilesContent(params);

      expect(mockAddLog).toHaveBeenCalledWith('No files selected to copy');
      expect(mockClipboardWriteText).not.toHaveBeenCalled();
    });

    it('should log error if generateCodebaseDocumentation fails', async () => {
      const documentationError = new Error('Documentation generation failed');
      (codebaseDocumentationUtils.generateCodebaseDocumentation as jest.Mock).mockRejectedValue(
        documentationError
      );

      const params: CopySelectedParams = {
        addLog: mockAddLog,
        rootPath: '/project',
      };

      await copySelectedFilesContent(params);

      expect(mockAddLog).toHaveBeenCalledWith('Failed to copy selected files');
      expect(mockClipboardWriteText).not.toHaveBeenCalled();
    });

    it('should log error if clipboard.writeText fails', async () => {
      const clipboardError = new Error('Clipboard write failed');
      mockClipboardWriteText.mockRejectedValue(clipboardError);

      const params: CopySelectedParams = {
        addLog: mockAddLog,
        rootPath: '/project',
      };

      await copySelectedFilesContent(params);

      expect(mockAddLog).toHaveBeenCalledWith('Failed to copy selected files');
    });
  });

  describe('copyFailedDiffContent', () => {
    it('should read multiple files, format them, and copy combined content', async () => {
      const params: CopyFailedDiffParams = {
        filePaths: ['src/file1.ts', 'src/file2.js'],
        addLog: mockAddLog,
        rootPath: '/project',
      };

      mockWindowFsReadFile
        .mockResolvedValueOnce('content of file1')
        .mockResolvedValueOnce('content of file2');

      (codebaseDocumentationUtils.formatSingleFile as jest.Mock)
        .mockReturnValueOnce('# src/file1.ts\n```\ncontent of file1\n```')
        .mockReturnValueOnce('# src/file2.js\n```\ncontent of file2\n```');

      await copyFailedDiffContent(params);

      expect(mockWindowFsReadFile).toHaveBeenCalledTimes(2);
      expect(mockWindowFsReadFile).toHaveBeenCalledWith('src/file1.ts', { encoding: 'utf8' });
      expect(mockWindowFsReadFile).toHaveBeenCalledWith('src/file2.js', { encoding: 'utf8' });

      expect(codebaseDocumentationUtils.formatSingleFile).toHaveBeenCalledWith(
        'src/file1.ts',
        'content of file1',
        '/project',
        false,
        DOC_FORMAT.XML
      );
      expect(codebaseDocumentationUtils.formatSingleFile).toHaveBeenCalledWith(
        'src/file2.js',
        'content of file2',
        '/project',
        false,
        DOC_FORMAT.XML
      );

      const expectedContent = [
        '# Failed UPDATE_DIFF Files',
        'The following files failed to apply UPDATE_DIFF operations. Please re-run the update diff with these current file contents:\n',
        '# src/file1.ts\n```\ncontent of file1\n```',
        '# src/file2.js\n```\ncontent of file2\n```',
        '\nPlease analyze these files and generate new UPDATE_DIFF blocks that will match the current content.',
      ].join('\n');

      expect(mockClipboardWriteText).toHaveBeenCalledWith(expectedContent);
      expect(mockAddLog).toHaveBeenCalledWith('Copied 2 files to clipboard (~150 tokens)');
    });

    it('should use formatType from store for formatSingleFile', async () => {
      (useFileSystemStore.getState as jest.Mock).mockReturnValue({
        formatType: DOC_FORMAT.MARKDOWN,
      });

      const params: CopyFailedDiffParams = {
        filePaths: ['src/test.ts'],
        addLog: mockAddLog,
        rootPath: '/project',
      };

      mockWindowFsReadFile.mockResolvedValueOnce('test content');

      await copyFailedDiffContent(params);

      expect(codebaseDocumentationUtils.formatSingleFile).toHaveBeenCalledWith(
        'src/test.ts',
        'test content',
        '/project',
        false,
        DOC_FORMAT.MARKDOWN
      );
    });

    it('should log error and stop if window.fileSystem.readFile fails for a file', async () => {
      const params: CopyFailedDiffParams = {
        filePaths: ['src/file1.ts', 'src/file2.js'],
        addLog: mockAddLog,
        rootPath: '/project',
      };

      const readError = new Error('File read failed');
      mockWindowFsReadFile.mockRejectedValueOnce(readError);

      await copyFailedDiffContent(params);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error reading file src/file1.ts:', readError);
      expect(mockAddLog).toHaveBeenCalledWith('Failed to read file: src/file1.ts');
      expect(mockClipboardWriteText).not.toHaveBeenCalled();
    });

    it('should log error if clipboard.writeText fails', async () => {
      const params: CopyFailedDiffParams = {
        filePaths: ['src/test.ts'],
        addLog: mockAddLog,
        rootPath: '/project',
      };

      mockWindowFsReadFile.mockResolvedValueOnce('test content');
      const clipboardError = new Error('Clipboard failed');
      mockClipboardWriteText.mockRejectedValue(clipboardError);

      await copyFailedDiffContent(params);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to copy failed diff content:', clipboardError);
      expect(mockAddLog).toHaveBeenCalledWith('Failed to copy failed diff content');
    });

    it('should handle empty filePaths array', async () => {
      const params: CopyFailedDiffParams = {
        filePaths: [],
        addLog: mockAddLog,
        rootPath: '/project',
      };

      await copyFailedDiffContent(params);

      const expectedContent = [
        '# Failed UPDATE_DIFF Files',
        'The following files failed to apply UPDATE_DIFF operations. Please re-run the update diff with these current file contents:\n',
        '\nPlease analyze these files and generate new UPDATE_DIFF blocks that will match the current content.',
      ].join('\n');

      expect(mockWindowFsReadFile).not.toHaveBeenCalled();
      expect(mockClipboardWriteText).toHaveBeenCalledWith(expectedContent);
      expect(mockAddLog).toHaveBeenCalledWith('Copied 0 files to clipboard (~150 tokens)');
    });

    it('should correctly construct the message block around file contents', async () => {
      const params: CopyFailedDiffParams = {
        filePaths: ['single.ts'],
        addLog: mockAddLog,
        rootPath: '/root',
      };

      mockWindowFsReadFile.mockResolvedValueOnce('single file content');
      (codebaseDocumentationUtils.formatSingleFile as jest.Mock).mockReturnValueOnce(
        'formatted single file'
      );

      await copyFailedDiffContent(params);

      const expectedParts = [
        '# Failed UPDATE_DIFF Files',
        'The following files failed to apply UPDATE_DIFF operations. Please re-run the update diff with these current file contents:\n',
        'formatted single file',
        '\nPlease analyze these files and generate new UPDATE_DIFF blocks that will match the current content.',
      ];

      expect(mockClipboardWriteText).toHaveBeenCalledWith(expectedParts.join('\n'));
    });
  });
});
