// AI Summary: Provides mock implementations and setup utilities for file system operations in Jest tests.
// Exports setupMockFs to simulate a file structure and clearMockFs to reset mocks between tests.

import { Stats } from 'fs';

// Mock fs/promises functions
export const mockFsAccess = jest.fn();
export const mockFsStat = jest.fn();
export const mockFsReadFile = jest.fn();
export const mockFsReaddir = jest.fn();
export const mockFsWriteFile = jest.fn();

// Mock the entire fs/promises module. This must be in the same file as the mocks it uses.
jest.mock('fs/promises', () => ({
  __esModule: true,
  access: mockFsAccess,
  stat: mockFsStat,
  readFile: mockFsReadFile,
  readdir: mockFsReaddir,
  writeFile: mockFsWriteFile,
}));

/**
 * Sets up the mock file system for tests.
 * @param files A map where keys are file/dir paths and values describe their properties.
 * @param content A map of file paths to their content.
 */
export const setupMockFs = (
  files: Map<string, { isDirectory: boolean; files?: string[] }>,
  content: Map<string, string> = new Map()
) => {
  mockFsAccess.mockImplementation(async (filePath) => {
    const pathStr = filePath.toString().replace(/\\/g, '/');
    if (!files.has(pathStr)) {
      const error = new Error(
        `ENOENT: no such file or directory, access '${pathStr}'`
      );
      (error as NodeJS.ErrnoException).code = 'ENOENT';
      throw error;
    }
  });

  mockFsStat.mockImplementation(async (filePath) => {
    const pathStr = filePath.toString().replace(/\\/g, '/');
    const entry = files.get(pathStr);
    if (!entry) {
      const error = new Error(
        `ENOENT: no such file or directory, stat '${pathStr}'`
      );
      (error as NodeJS.ErrnoException).code = 'ENOENT';
      throw error;
    }
    return { isDirectory: () => entry.isDirectory } as Stats;
  });

  mockFsReaddir.mockImplementation(async (dirPath) => {
    const pathStr = dirPath.toString().replace(/\\/g, '/');
    const entry = files.get(pathStr);
    if (!entry || !entry.isDirectory) {
      const error = new Error(`ENOTDIR: not a directory, scandir '${pathStr}'`);
      (error as NodeJS.ErrnoException).code = 'ENOTDIR';
      throw error;
    }
    return (entry.files ?? []) as any;
  });

  mockFsReadFile.mockImplementation(async (filePath) => {
    const pathStr = filePath.toString().replace(/\\/g, '/');
    const fileContent = content.get(pathStr);
    if (fileContent !== undefined) {
      return fileContent;
    }
    // If a file is in the `files` map but not `content`, it exists but is empty.
    if (files.has(pathStr) && !files.get(pathStr)?.isDirectory) {
      return '';
    }
    const error = new Error(
      `ENOENT: no such file or directory, open '${pathStr}'`
    );
    (error as NodeJS.ErrnoException).code = 'ENOENT';
    throw error;
  });

  // Default for writeFile
  mockFsWriteFile.mockResolvedValue(undefined);
};

/**
 * Clears all filesystem mocks.
 */
export const clearMockFs = () => {
  jest.clearAllMocks();
};
