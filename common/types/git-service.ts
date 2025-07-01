// AI Summary: Defines interfaces for Git service operations.
// Includes types for commit logs, file status, and the main IGitService contract for repository interactions.

export interface GitCommitsForFileOptions {
  maxCount?: number;
  since?: string;
}

export interface CommitLog {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitFileStatus {
  path: string;
  status: 'A' | 'M' | 'D'; // Added, Modified, Deleted
}

export interface IGitService {
  setBaseDir(baseDir: string): void;
  getBaseDir(): string;
  isGitRepository(): Promise<boolean>;
  getCommitsForFile(
    filePath: string,
    options?: GitCommitsForFileOptions
  ): Promise<CommitLog[]>;
  getFilesForCommit(commitHash: string): Promise<string[]>;
  getRecentlyCommittedFiles(daysAgo: number): Promise<string[]>;
  getRecentCommitHashes(maxCount: number): Promise<string[]>;
  getUncommittedChanges(): Promise<GitFileStatus[]>;
  getContentAtHead(filePath: string): Promise<string>;
}
