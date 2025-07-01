// AI Summary: Defines IPC handlers for Git-related operations like viewing diffs.
// It orchestrates calls to GitService and FileService to provide uncommitted changes to the renderer process.
import { ipcMain } from 'electron';
import type { GitService } from '../services/GitService';
import type { FileService } from '../services/FileService';
import type { GitDiffData } from '../../common/types/git-service';

export function setupGitHandlers(
  gitService: GitService,
  fileService: FileService
) {
  ipcMain.handle('git:view-diffs', async (): Promise<GitDiffData[]> => {
    const changedFiles = await gitService.getUncommittedChanges();
    const diffs: GitDiffData[] = [];

    for (const file of changedFiles) {
      const oldCode = await gitService.getContentAtHead(file.path);
      let newCode = '';
      try {
        // New code is the current content on disk (unless deleted)
        if (file.status !== 'D') {
          // Explicitly read as utf8 to ensure a string is returned, not a buffer
          newCode = (await fileService.read(file.path, {
            encoding: 'utf8',
          })) as string;
        }
      } catch (e) {
        // Could fail if file was deleted between git diff and read, which is fine
        console.warn(`Could not read file for diff: ${file.path}`, e);
      }
      diffs.push({ ...file, oldCode, newCode });
    }
    return diffs;
  });

  ipcMain.handle('git:is-repo', () => {
    return gitService.isGitRepository();
  });
}
