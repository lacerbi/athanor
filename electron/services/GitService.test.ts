// AI Summary: Unit tests for GitService covering command generation, output parsing,
// and error handling scenarios. Uses mocked child_process to test without actual Git repository.

// This mock function must be defined before it is used in the 'util' mock factory.
const mockExecAsync = jest.fn();

// Mock 'util' to intercept promisify(exec). This must be done before GitService is imported.
jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: jest.fn(fn => {
    // If the function being promisified is `exec`, return our mock async function.
    if (fn === require('child_process').exec) {
      return mockExecAsync;
    }
    // Otherwise, use the real promisify for other modules.
    return jest.requireActual('util').promisify(fn);
  }),
}));

// Now that mocks are set up, import the modules that will use them.
import { GitService } from './GitService';
import * as fs from 'fs/promises';

// Mock other dependencies used by GitService.
jest.mock('fs/promises');
jest.mock('child_process'); // This ensures that require('child_process').exec points to a mock.

const mockFsAccess = fs.access as jest.MockedFunction<typeof fs.access>;

describe('GitService', () => {
  let gitService: GitService;
  const mockBaseDir = '/test/project';

  beforeEach(() => {
    gitService = new GitService(mockBaseDir);
    // Clear mock history before each test, but not the mock implementation itself.
    jest.clearAllMocks();
  });

  describe('constructor and base directory management', () => {
    it('should normalize base directory path', () => {
      const service = new GitService('C:\\test\\project');
      expect(service.getBaseDir()).toBe('C:/test/project');
    });

    it('should set and get base directory', () => {
      gitService.setBaseDir('/new/path');
      expect(gitService.getBaseDir()).toBe('/new/path');
    });
  });

  describe('isGitRepository', () => {
    it('should return true when .git directory exists and git command works', async () => {
      mockFsAccess.mockResolvedValueOnce(undefined);
      mockExecAsync.mockResolvedValueOnce({ stdout: '.git', stderr: '' });

      const result = await gitService.isGitRepository();

      expect(result).toBe(true);
      expect(mockFsAccess).toHaveBeenCalledWith(
        expect.stringMatching(/[\/\\]test[\/\\]project[\/\\]\.git$/)
      );
      expect(mockExecAsync).toHaveBeenCalledWith(
        'git rev-parse --git-dir',
        expect.any(Object)
      );
    });

    it('should return false when .git directory does not exist', async () => {
      mockFsAccess.mockRejectedValueOnce(new Error('ENOENT'));

      const result = await gitService.isGitRepository();

      expect(result).toBe(false);
      expect(mockExecAsync).not.toHaveBeenCalled();
    });

    it('should return false when git command fails', async () => {
      mockFsAccess.mockResolvedValueOnce(undefined);
      mockExecAsync.mockRejectedValueOnce(new Error('Not a git repository'));

      const result = await gitService.isGitRepository();

      expect(result).toBe(false);
    });
  });

  describe('getCommitsForFile', () => {
    const mockCommitOutput = `abc123|Initial commit|John Doe|2023-01-01 10:00:00 +0000
def456|Update file|Jane Smith|2023-01-02 15:30:00 +0000
ghi789|Bug fix|Bob Johnson|2023-01-03 09:15:00 +0000`;

    it('should return commit history for a file', async () => {
      // Mock for isGitRepository() check
      mockFsAccess.mockResolvedValue(undefined);
      mockExecAsync.mockResolvedValueOnce({ stdout: '.git', stderr: '' });
      // Mock for the actual git log command
      mockExecAsync.mockResolvedValueOnce({ stdout: mockCommitOutput, stderr: '' });

      const commits = await gitService.getCommitsForFile('src/test.ts');

      expect(commits).toHaveLength(3);
      expect(commits[0]).toEqual({
        hash: 'abc123',
        message: 'Initial commit',
        author: 'John Doe',
        date: '2023-01-01 10:00:00 +0000',
      });
      expect(commits[1]).toEqual({
        hash: 'def456',
        message: 'Update file',
        author: 'Jane Smith',
        date: '2023-01-02 15:30:00 +0000',
      });
    });

    it('should apply maxCount option', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockExecAsync.mockResolvedValueOnce({ stdout: '.git', stderr: '' });
      mockExecAsync.mockResolvedValueOnce({ stdout: mockCommitOutput, stderr: '' });

      await gitService.getCommitsForFile('src/test.ts', { maxCount: 2 });

      expect(mockExecAsync).toHaveBeenCalledTimes(2);
      expect(mockExecAsync).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('-n 2'),
        expect.any(Object)
      );
    });

    it('should apply since option', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockExecAsync.mockResolvedValueOnce({ stdout: '.git', stderr: '' });
      mockExecAsync.mockResolvedValueOnce({ stdout: mockCommitOutput, stderr: '' });

      await gitService.getCommitsForFile('src/test.ts', { since: '1 week ago' });

      expect(mockExecAsync).toHaveBeenCalledTimes(2);
      expect(mockExecAsync).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('--since="1 week ago"'),
        expect.any(Object)
      );
    });

    it('should return empty array when not a git repository', async () => {
      mockFsAccess.mockRejectedValueOnce(new Error('ENOENT'));

      const commits = await gitService.getCommitsForFile('src/test.ts');

      expect(commits).toEqual([]);
      expect(mockExecAsync).not.toHaveBeenCalled();
    });

    it('should return empty array when git command returns no output', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockExecAsync.mockResolvedValueOnce({ stdout: '.git', stderr: '' });
      mockExecAsync.mockResolvedValueOnce({ stdout: '', stderr: '' });

      const commits = await gitService.getCommitsForFile('src/test.ts');

      expect(commits).toEqual([]);
    });

    it('should handle git command errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockFsAccess.mockResolvedValue(undefined);
      mockExecAsync.mockResolvedValueOnce({ stdout: '.git', stderr: '' });
      mockExecAsync.mockRejectedValueOnce(new Error('Git error'));

      const commits = await gitService.getCommitsForFile('src/test.ts');

      expect(commits).toEqual([]);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getFilesForCommit', () => {
    const mockFilesOutput = `src/components/Button.tsx
src/styles/button.css
tests/Button.test.tsx`;

    it('should return list of files for a commit', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockExecAsync.mockResolvedValueOnce({ stdout: '.git', stderr: '' });
      mockExecAsync.mockResolvedValueOnce({ stdout: mockFilesOutput, stderr: '' });

      const files = await gitService.getFilesForCommit('abc123');

      expect(files).toEqual([
        'src/components/Button.tsx',
        'src/styles/button.css',
        'tests/Button.test.tsx',
      ]);
    });

    it('should normalize file paths', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockExecAsync.mockResolvedValueOnce({ stdout: '.git', stderr: '' });
      mockExecAsync.mockResolvedValueOnce({ stdout: 'src\\windows\\path.txt', stderr: '' });

      const files = await gitService.getFilesForCommit('abc123');

      expect(files).toEqual(['src/windows/path.txt']);
    });

    it('should return empty array when not a git repository', async () => {
      mockFsAccess.mockRejectedValueOnce(new Error('ENOENT'));

      const files = await gitService.getFilesForCommit('abc123');

      expect(files).toEqual([]);
      expect(mockExecAsync).not.toHaveBeenCalled();
    });

    it('should handle empty output', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockExecAsync.mockResolvedValueOnce({ stdout: '.git', stderr: '' });
      mockExecAsync.mockResolvedValueOnce({ stdout: '', stderr: '' });

      const files = await gitService.getFilesForCommit('abc123');

      expect(files).toEqual([]);
    });
  });

  describe('getRecentlyCommittedFiles', () => {
    const mockRecentFilesOutput = `src/components/Header.tsx
src/utils/helpers.ts
src/components/Header.tsx
README.md`;

    it('should return deduplicated list of recently committed files', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockExecAsync.mockResolvedValueOnce({ stdout: '.git', stderr: '' });
      mockExecAsync.mockResolvedValueOnce({ stdout: mockRecentFilesOutput, stderr: '' });

      const files = await gitService.getRecentlyCommittedFiles(7);

      expect(files).toEqual([
        'src/components/Header.tsx',
        'src/utils/helpers.ts',
        'README.md',
      ]);
      expect(files).toHaveLength(3); // Duplicates should be removed
    });

    it('should use correct days parameter in command', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockExecAsync.mockResolvedValueOnce({ stdout: '.git', stderr: '' });
      mockExecAsync.mockResolvedValueOnce({ stdout: mockRecentFilesOutput, stderr: '' });

      await gitService.getRecentlyCommittedFiles(14);

      expect(mockExecAsync).toHaveBeenCalledTimes(2);
      expect(mockExecAsync).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('--since="14 days ago"'),
        expect.any(Object)
      );
    });

    it('should return empty array when not a git repository', async () => {
      mockFsAccess.mockRejectedValueOnce(new Error('ENOENT'));

      const files = await gitService.getRecentlyCommittedFiles(7);

      expect(files).toEqual([]);
      expect(mockExecAsync).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle git not installed error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockFsAccess.mockResolvedValue(undefined);
      const error: any = new Error('ENOENT');
      error.code = 'ENOENT';
      mockExecAsync.mockRejectedValue(error);

      // isGitRepository will fail and return false, causing the main method to return []
      const commits = await gitService.getCommitsForFile('src/test.ts');
      expect(commits).toEqual([]);
      consoleErrorSpy.mockRestore();
    });

    it('should handle git command stderr', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockFsAccess.mockResolvedValue(undefined);
      mockExecAsync.mockResolvedValueOnce({ stdout: '.git', stderr: '' });

      const error: any = new Error('Git error');
      error.stderr = 'fatal: not a git repository';
      mockExecAsync.mockRejectedValueOnce(error);

      // The service catches the error from executeGitCommand and returns an empty array
      const commits = await gitService.getCommitsForFile('src/test.ts');
      expect(commits).toEqual([]);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('commit log parsing', () => {
    it('should handle malformed commit log entries', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockExecAsync.mockResolvedValueOnce({ stdout: '.git', stderr: '' });
      mockExecAsync.mockResolvedValueOnce({ stdout: 'abc123|Only two parts', stderr: '' });

      const commits = await gitService.getCommitsForFile('src/test.ts');
      expect(commits).toEqual([]); // Should skip malformed entries
    });

    it('should handle empty lines in commit log', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockExecAsync.mockResolvedValueOnce({ stdout: '.git', stderr: '' });
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'abc123|Valid commit|Author|Date\n\n\ndef456|Another valid|Author2|Date2',
        stderr: '',
      });

      const commits = await gitService.getCommitsForFile('src/test.ts');
      expect(commits).toHaveLength(2);
      expect(commits[0].hash).toBe('abc123');
      expect(commits[1].hash).toBe('def456');
    });
  });
});
