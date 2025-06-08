// AI Summary: Defines the contract for Git operations including commit history queries,
// file tracking, and repository validation for the context builder system.

export interface CommitLog {
  hash: string;
  message: string;
  author: string;
  date: string;
  files?: string[];
}

export interface GitCommitsForFileOptions {
  maxCount?: number;
  since?: string;
}

export interface IGitService {
  /**
   * Check if the current directory is a Git repository
   * @returns True if .git directory exists and git commands can be executed
   */
  isGitRepository(): Promise<boolean>;

  /**
   * Get commit history for a specific file
   * @param filePath Project-relative path to the file
   * @param options Optional parameters for limiting results
   * @returns Array of commit log entries
   */
  getCommitsForFile(filePath: string, options?: GitCommitsForFileOptions): Promise<CommitLog[]>;

  /**
   * Get list of files modified in a specific commit
   * @param commitHash The commit hash to analyze
   * @returns Array of project-relative file paths
   */
  getFilesForCommit(commitHash: string): Promise<string[]>;

  /**
   * Get list of files that have been committed recently
   * @param daysAgo Number of days to look back
   * @returns Array of project-relative file paths
   */
  getRecentlyCommittedFiles(daysAgo: number): Promise<string[]>;

  /**
   * Set the base directory for Git operations
   * @param baseDir Absolute path to the Git repository root
   */
  setBaseDir(baseDir: string): void;

  /**
   * Get the current base directory
   * @returns Current Git repository base directory
   */
  getBaseDir(): string;
}
