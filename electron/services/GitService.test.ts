// AI Summary: Unit tests for GitService covering command generation, output parsing,
// and error handling scenarios. Uses mocked child_process to test without actual Git repository.

import { GitService } from './GitService';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';

// Mock child_process and fs
jest.mock('child_process');
jest.mock('fs/promises');

const mockExec = exec as jest.MockedFunction<typeof exec>;
const mockFsAccess = fs.access as jest.MockedFunction<typeof fs.access>;

// Mock promisify to return a function that returns a promise
jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: jest.fn((fn) => {
    if (fn === exec) {
      return jest.fn((command: string, options?: any) => {
        return new Promise((resolve, reject) => {
          // Call the mocked exec with a callback
          (fn as any)(command, options, (error: any, stdout: string, stderr: string) => {
            if (error) {
              reject(error);
            } else {
              resolve({ stdout, stderr });
            }
          });
        });
      });
    }
    return jest.requireActual('util').promisify(fn);
  }),
}));

describe('GitService', () => {
  let gitService: GitService;
  const mockBaseDir = '/test/project';

  beforeEach(() => {
    gitService = new GitService(mockBaseDir);
    jest.resetAllMocks();
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
      mockExec.mockImplementationOnce((command, options, callback) => {
        const actualCallback = typeof options === 'function' ? options : callback;
        setImmediate(() => {
          actualCallback!(null, '.git', '');
        });
        return {} as any;
      });

      const result = await gitService.isGitRepository();
      expect(result).toBe(true);
      expect(mockFsAccess).toHaveBeenCalledWith(expect.stringMatching(/[\/\\]test[\/\\]project[\/\\]\.git$/));
    });

    it('should return false when .git directory does not exist', async () => {
      mockFsAccess.mockRejectedValueOnce(new Error('ENOENT'));

      const result = await gitService.isGitRepository();
      expect(result).toBe(false);
    });

    it('should return false when git command fails', async () => {
      mockFsAccess.mockResolvedValueOnce(undefined);
      mockExec.mockImplementationOnce((command, options, callback) => {
        const actualCallback = typeof options === 'function' ? options : callback;
        setImmediate(() => {
          actualCallback!(new Error('Not a git repository'), '', '');
        });
        return {} as any;
      });

      const result = await gitService.isGitRepository();
      expect(result).toBe(false);
    });
  });

  describe('getCommitsForFile', () => {
    const mockCommitOutput = `abc123|Initial commit|John Doe|2023-01-01 10:00:00 +0000
def456|Update file|Jane Smith|2023-01-02 15:30:00 +0000
ghi789|Bug fix|Bob Johnson|2023-01-03 09:15:00 +0000`;

    it('should return commit history for a file', async () => {
      // Mock isGitRepository to return true
      mockFsAccess.mockResolvedValue(undefined);
      mockExec.mockImplementation((command, options, callback) => {
        // Handle both 2-arg and 3-arg forms of exec
        const actualCallback = typeof options === 'function' ? options : callback;
        const cmd = command as string;
        
        // Use setImmediate for better compatibility with Jest's promise handling
        setImmediate(() => {
          if (cmd.includes('rev-parse --git-dir')) {
            actualCallback!(null, '.git', '');
          } else if (cmd.includes('log --format=')) {
            actualCallback!(null, mockCommitOutput, '');
          } else {
            actualCallback!(new Error(`Unmocked command: ${cmd}`), '', '');
          }
        });
        
        return {} as any;
      });

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
      mockExec.mockImplementation((command, options, callback) => {
        const actualCallback = typeof options === 'function' ? options : callback;
        const cmd = command as string;
        
        setImmediate(() => {
          if (cmd.includes('rev-parse --git-dir')) {
            actualCallback!(null, '.git', '');
          } else if (cmd.includes('log --format=')) {
            actualCallback!(null, mockCommitOutput, '');
          } else {
            actualCallback!(new Error(`Unmocked command: ${cmd}`), '', '');
          }
        });
        
        return {} as any;
      });

      await gitService.getCommitsForFile('src/test.ts', { maxCount: 2 });

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('-n 2'),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should apply since option', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockExec.mockImplementation((command, options, callback) => {
        const actualCallback = typeof options === 'function' ? options : callback;
        const cmd = command as string;
        
        setImmediate(() => {
          if (cmd.includes('rev-parse --git-dir')) {
            actualCallback!(null, '.git', '');
          } else if (cmd.includes('log --format=')) {
            actualCallback!(null, mockCommitOutput, '');
          } else {
            actualCallback!(new Error(`Unmocked command: ${cmd}`), '', '');
          }
        });
        
        return {} as any;
      });

      await gitService.getCommitsForFile('src/test.ts', { since: '1 week ago' });

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('--since="1 week ago"'),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should return empty array when not a git repository', async () => {
      mockFsAccess.mockRejectedValueOnce(new Error('ENOENT'));

      const commits = await gitService.getCommitsForFile('src/test.ts');
      expect(commits).toEqual([]);
    });

    it('should return empty array when git command returns no output', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockExec.mockImplementation((command, options, callback) => {
        const actualCallback = typeof options === 'function' ? options : callback;
        const cmd = command as string;
        
        setImmediate(() => {
          if (cmd.includes('rev-parse --git-dir')) {
            actualCallback!(null, '.git', '');
          } else if (cmd.includes('log --format=')) {
            actualCallback!(null, '', '');
          } else {
            actualCallback!(new Error(`Unmocked command: ${cmd}`), '', '');
          }
        });
        
        return {} as any;
      });

      const commits = await gitService.getCommitsForFile('src/test.ts');
      expect(commits).toEqual([]);
    });

    it('should handle git command errors gracefully', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockExec.mockImplementation((command, options, callback) => {
        const actualCallback = typeof options === 'function' ? options : callback;
        const cmd = command as string;
        
        setImmediate(() => {
          if (cmd.includes('rev-parse --git-dir')) {
            actualCallback!(null, '.git', '');
          } else if (cmd.includes('log --format=')) {
            actualCallback!(new Error('Git error'), '', '');
          } else {
            actualCallback!(new Error(`Unmocked command: ${cmd}`), '', '');
          }
        });
        
        return {} as any;
      });

      const commits = await gitService.getCommitsForFile('src/test.ts');
      expect(commits).toEqual([]);
    });
  });

  describe('getFilesForCommit', () => {
    const mockFilesOutput = `src/components/Button.tsx
src/styles/button.css
tests/Button.test.tsx`;

    it('should return list of files for a commit', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockExec.mockImplementation((command, options, callback) => {
        const actualCallback = typeof options === 'function' ? options : callback;
        const cmd = command as string;
        
        setImmediate(() => {
          if (cmd.includes('rev-parse --git-dir')) {
            actualCallback!(null, '.git', '');
          } else if (cmd.includes('show --name-only')) {
            actualCallback!(null, mockFilesOutput, '');
          } else {
            actualCallback!(new Error(`Unmocked command: ${cmd}`), '', '');
          }
        });
        
        return {} as any;
      });

      const files = await gitService.getFilesForCommit('abc123');

      expect(files).toEqual([
        'src/components/Button.tsx',
        'src/styles/button.css',
        'tests/Button.test.tsx',
      ]);
    });

    it('should normalize file paths', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockExec.mockImplementation((command, options, callback) => {
        const actualCallback = typeof options === 'function' ? options : callback;
        const cmd = command as string;
        
        setImmediate(() => {
          if (cmd.includes('rev-parse --git-dir')) {
            actualCallback!(null, '.git', '');
          } else if (cmd.includes('show --name-only')) {
            actualCallback!(null, 'src\\windows\\path.txt', '');
          } else {
            actualCallback!(new Error(`Unmocked command: ${cmd}`), '', '');
          }
        });
        
        return {} as any;
      });

      const files = await gitService.getFilesForCommit('abc123');
      expect(files).toEqual(['src/windows/path.txt']);
    });

    it('should return empty array when not a git repository', async () => {
      mockFsAccess.mockRejectedValueOnce(new Error('ENOENT'));

      const files = await gitService.getFilesForCommit('abc123');
      expect(files).toEqual([]);
    });

    it('should handle empty output', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockExec.mockImplementation((command, options, callback) => {
        const actualCallback = typeof options === 'function' ? options : callback;
        const cmd = command as string;
        
        setImmediate(() => {
          if (cmd.includes('rev-parse --git-dir')) {
            actualCallback!(null, '.git', '');
          } else if (cmd.includes('show --name-only')) {
            actualCallback!(null, '', '');
          } else {
            actualCallback!(new Error(`Unmocked command: ${cmd}`), '', '');
          }
        });
        
        return {} as any;
      });

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
      mockExec.mockImplementation((command, options, callback) => {
        const actualCallback = typeof options === 'function' ? options : callback;
        const cmd = command as string;
        
        setImmediate(() => {
          if (cmd.includes('rev-parse --git-dir')) {
            actualCallback!(null, '.git', '');
          } else if (cmd.includes('log --name-only')) {
            actualCallback!(null, mockRecentFilesOutput, '');
          } else {
            actualCallback!(new Error(`Unmocked command: ${cmd}`), '', '');
          }
        });
        
        return {} as any;
      });

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
      mockExec.mockImplementation((command, options, callback) => {
        const actualCallback = typeof options === 'function' ? options : callback;
        const cmd = command as string;
        
        setImmediate(() => {
          if (cmd.includes('rev-parse --git-dir')) {
            actualCallback!(null, '.git', '');
          } else if (cmd.includes('log --name-only')) {
            actualCallback!(null, mockRecentFilesOutput, '');
          } else {
            actualCallback!(new Error(`Unmocked command: ${cmd}`), '', '');
          }
        });
        
        return {} as any;
      });

      await gitService.getRecentlyCommittedFiles(14);

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('--since="14 days ago"'),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should return empty array when not a git repository', async () => {
      mockFsAccess.mockRejectedValueOnce(new Error('ENOENT'));

      const files = await gitService.getRecentlyCommittedFiles(7);
      expect(files).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle git not installed error', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockExec.mockImplementation((command, options, callback) => {
        const actualCallback = typeof options === 'function' ? options : callback;
        setImmediate(() => {
          const error = new Error('ENOENT') as any;
          error.code = 'ENOENT';
          actualCallback!(error, '', '');
        });
        return {} as any;
      });

      const commits = await gitService.getCommitsForFile('src/test.ts');
      expect(commits).toEqual([]);
    });

    it('should handle git command stderr', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockExec.mockImplementation((command, options, callback) => {
        const actualCallback = typeof options === 'function' ? options : callback;
        const cmd = command as string;
        setImmediate(() => {
          if (cmd.includes('rev-parse --git-dir')) {
            actualCallback!(null, '.git', '');
          } else if (cmd.includes('log --format=')) {
            const error = new Error('Git error') as any;
            error.stderr = 'fatal: not a git repository';
            actualCallback!(error, '', 'fatal: not a git repository');
          } else {
            actualCallback!(new Error(`Unmocked command: ${cmd}`), '', '');
          }
        });
        return {} as any;
      });

      const commits = await gitService.getCommitsForFile('src/test.ts');
      expect(commits).toEqual([]);
    });
  });

  describe('commit log parsing', () => {
    it('should handle malformed commit log entries', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockExec.mockImplementation((command, options, callback) => {
        const actualCallback = typeof options === 'function' ? options : callback;
        const cmd = command as string;
        setImmediate(() => {
          if (cmd.includes('rev-parse --git-dir')) {
            actualCallback!(null, '.git', '');
          } else if (cmd.includes('log --format=')) {
            // Malformed output with missing parts
            actualCallback!(null, 'abc123|Only two parts', '');
          } else {
            actualCallback!(new Error(`Unmocked command: ${cmd}`), '', '');
          }
        });
        return {} as any;
      });

      const commits = await gitService.getCommitsForFile('src/test.ts');
      expect(commits).toEqual([]); // Should skip malformed entries
    });

    it('should handle empty lines in commit log', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockExec.mockImplementation((command, options, callback) => {
        const actualCallback = typeof options === 'function' ? options : callback;
        const cmd = command as string;
        
        setImmediate(() => {
          if (cmd.includes('rev-parse --git-dir')) {
            actualCallback!(null, '.git', '');
          } else if (cmd.includes('log --format=')) {
            actualCallback!(null, 'abc123|Valid commit|Author|Date\n\n\ndef456|Another valid|Author2|Date2', '');
          } else {
            actualCallback!(new Error(`Unmocked command: ${cmd}`), '', '');
          }
        });
        
        return {} as any;
      });

      const commits = await gitService.getCommitsForFile('src/test.ts');
      expect(commits).toHaveLength(2);
      expect(commits[0].hash).toBe('abc123');
      expect(commits[1].hash).toBe('def456');
    });
  });
});
