// AI Summary: Handles selection of files based on provided paths with file system store integration.
// Validates paths and updates application selection state while providing logging feedback.
import { useFileSystemStore } from '../stores/fileSystemStore';

export interface SelectCommandParams {
  content: string;
  addLog: (message: string) => void;
}

export async function executeSelectCommand({
  content,
  addLog,
}: SelectCommandParams): Promise<boolean> {
  const fileSystemStore = useFileSystemStore.getState();

  // Clear existing selections
  fileSystemStore.clearSelections();

  // Split content on whitespace to get file paths
  const filePaths = content
    .trim()
    .split(/\s+/);

  // Select all specified files
  fileSystemStore.selectItems(filePaths);

  // Log success message with all selected files
  addLog(
    `Selected ${filePaths.length} files based on command: ${filePaths.join(' ')}`
  );
  return true;
}
