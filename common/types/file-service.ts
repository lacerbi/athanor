// AI Summary: Core interface definition for file system operations with clear path conventions
// and comprehensive functionality for file/directory manipulation, watching, and resource access.

import * as fs from 'fs'; // Use fs types for Stats

export interface IFileService {
  // --- Path Helpers (Consider moving pure ones to PathUtils) ---
  toUnix(p: string): string;
  toOS(p: string): string;
  join(...parts: string[]): string;
  dirname(p: string): string;         // Pure: Good candidate for PathUtils
  basename(p: string): string;        // Pure: Good candidate for PathUtils
  extname(p: string): string;         // Pure: Good candidate for PathUtils
  resolve(relativePath: string): string; // Resolves relative path from baseDir to absolute Unix path
  relativize(absolutePath: string): string; // Converts absolute Unix path to project-relative Unix path

  // --- Basic FS Operations (Async) ---
  // All methods accept either project-relative paths or absolute paths
  read(pathStr: string, opts?: { encoding?: BufferEncoding }): Promise<string | Buffer>;
  write(pathStr: string, data: string | Buffer): Promise<void>;
  remove(pathStr: string): Promise<void>;
  exists(pathStr: string): Promise<boolean>;
  stats(pathStr: string): Promise<fs.Stats | null>;
  isDirectory(pathStr: string): Promise<boolean>; // Convenience method
  ensureDir(pathStr: string): Promise<void>; // Ensures directory exists (recursive)
  readdir(pathStr: string, opts?: { applyIgnores?: boolean }): Promise<string[]>; // Returns basenames

  // --- Watcher Management ---
  // Returns an unsubscribe function
  // Accepts either project-relative paths or absolute paths
  watch(
    pathStr: string,
    callback: (
      event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir',
      projectRelativeFile: string // Always provides project-relative path
    ) => void
  ): () => void;

  // --- Base Directory Management ---
  setBaseDir(absoluteDir: string): Promise<void>;
  getBaseDir(): string; // Returns absolute Unix path

  // --- Ignore Rules Integration (Internal detail, but influences readdir/watch) ---
  // Might expose reloadIgnoreRules() if needed, but primarily managed internally
  reloadIgnoreRules(): Promise<void>;
  isIgnored(projectRelativePath: string): boolean;

  // --- Application/Resource Path Helpers (Separate from baseDir logic) ---
  getAppPath(): string; // Absolute path to app root
  getResourcesPath(): Promise<string>; // Absolute path to resources dir (dev/prod aware)
  getPromptTemplatePath(templateName: string): Promise<string>; // Absolute path to specific template
}
