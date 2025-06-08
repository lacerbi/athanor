// AI Summary: Git service providing repository analysis capabilities through command-line interface.
// Handles commit history queries, file tracking, and repository validation with robust error handling.
// Core component for context builder heuristics like shared commits and recent activity analysis.

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import type { IGitService, CommitLog, GitCommitsForFileOptions } from '../../common/types/git-service';
import { PathUtils } from './PathUtils';

const execAsync = promisify(exec);

export class GitService implements IGitService {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = PathUtils.normalizeToUnix(baseDir);
  }

  /**
   * Set the base directory for Git operations
   * @param baseDir Absolute path to the Git repository root
   */
  setBaseDir(baseDir: string): void {
    this.baseDir = PathUtils.normalizeToUnix(baseDir);
  }

  /**
   * Get the current base directory
   * @returns Current Git repository base directory
   */
  getBaseDir(): string {
    return this.baseDir;
  }

  /**
   * Check if the current directory is a Git repository
   * @returns True if .git directory exists and git commands can be executed
   */
  async isGitRepository(): Promise<boolean> {
    try {
      // Check for .git directory
      const gitDir = PathUtils.joinUnix(this.baseDir, '.git');
      const platformGitDir = PathUtils.toPlatform(gitDir);
      
      await fs.access(platformGitDir);
      
      // Verify git command works in this directory
      await this.executeGitCommand('rev-parse --git-dir');
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get commit history for a specific file
   * @param filePath Project-relative path to the file
   * @param options Optional parameters for limiting results
   * @returns Array of commit log entries
   */
  async getCommitsForFile(filePath: string, options: GitCommitsForFileOptions = {}): Promise<CommitLog[]> {
    try {
      if (!(await this.isGitRepository())) {
        return [];
      }

      const { maxCount = 50, since } = options;
      
      // Build git log command
      let command = `log --format="%H|%s|%an|%ai" --follow`;
      
      if (maxCount > 0) {
        command += ` -n ${maxCount}`;
      }
      
      if (since) {
        command += ` --since="${since}"`;
      }
      
      command += ` -- "${filePath}"`;
      
      const output = await this.executeGitCommand(command);
      
      if (!output || !output.trim()) {
        return [];
      }
      
      return this.parseCommitLog(output);
    } catch (error) {
      console.error(`Error getting commits for file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Get list of files modified in a specific commit
   * @param commitHash The commit hash to analyze
   * @returns Array of project-relative file paths
   */
  async getFilesForCommit(commitHash: string): Promise<string[]> {
    try {
      if (!(await this.isGitRepository())) {
        return [];
      }

      const command = `show --name-only --format="" ${commitHash}`;
      const output = await this.executeGitCommand(command);
      
      if (!output || !output.trim()) {
        return [];
      }
      
      return output
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => PathUtils.normalizeToUnix(line));
    } catch (error) {
      console.error(`Error getting files for commit ${commitHash}:`, error);
      return [];
    }
  }

  /**
   * Get list of files that have been committed recently
   * @param daysAgo Number of days to look back
   * @returns Array of project-relative file paths
   */
  async getRecentlyCommittedFiles(daysAgo: number): Promise<string[]> {
    try {
      if (!(await this.isGitRepository())) {
        return [];
      }

      const command = `log --name-only --format="" --since="${daysAgo} days ago"`;
      const output = await this.executeGitCommand(command);
      
      if (!output || !output.trim()) {
        return [];
      }
      
      // Parse output and deduplicate files
      const files = new Set<string>();
      
      output
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .forEach(line => {
          files.add(PathUtils.normalizeToUnix(line));
        });
      
      return Array.from(files);
    } catch (error) {
      console.error(`Error getting recently committed files:`, error);
      return [];
    }
  }

  /**
   * Execute a git command in the base directory
   * @param command Git command to execute (without 'git' prefix)
   * @returns Command output
   */
  private async executeGitCommand(command: string): Promise<string> {
    const fullCommand = `git ${command}`;
    const platformBaseDir = PathUtils.toPlatform(this.baseDir);
    
    try {
      const { stdout, stderr } = await execAsync(fullCommand, {
        cwd: platformBaseDir,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024, // 1MB buffer for large outputs
      });
      
      if (stderr && stderr.trim()) {
        console.warn(`Git command stderr: ${stderr}`);
      }
      
      return stdout;
    } catch (error: any) {
      // Check if git is not installed
      if (error.code === 'ENOENT') {
        throw new Error('Git is not installed or not available in PATH');
      }
      
      // Check for git-specific errors
      if (error.stderr) {
        throw new Error(`Git command failed: ${error.stderr}`);
      }
      
      throw error;
    }
  }

  /**
   * Parse git log output into CommitLog objects
   * @param output Raw git log output
   * @returns Array of parsed commit log entries
   */
  private parseCommitLog(output: string): CommitLog[] {
    const commits: CommitLog[] = [];
    
    const lines = output.split('\n').filter(line => line.trim().length > 0);
    
    for (const line of lines) {
      const parts = line.split('|');
      
      if (parts.length >= 4) {
        commits.push({
          hash: parts[0].trim(),
          message: parts[1].trim(),
          author: parts[2].trim(),
          date: parts[3].trim(),
        });
      }
    }
    
    return commits;
  }
}
