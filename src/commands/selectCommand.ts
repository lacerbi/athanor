// AI Summary: Handles selection of files based on provided paths with workbench store integration.
// Validates paths and updates active tab selection state while providing logging feedback.
import { useWorkbenchStore } from '../stores/workbenchStore';

export interface SelectCommandParams {
  content: string;
  addLog: (message: string) => void;
}

export async function executeSelectCommand({
  content,
  addLog,
}: SelectCommandParams): Promise<boolean> {
  const workbenchStore = useWorkbenchStore.getState();

  // Clear existing selections for active tab
  workbenchStore.clearFileSelection();

  // Split content on whitespace to get file paths
  const filePaths = content
    .trim()
    .split(/\s+/)
    .filter(path => path.length > 0); // Filter out empty strings

  // Select all specified files for active tab
  // Add files in reverse order so they appear in correct order (newest first)
  filePaths.reverse().forEach(filePath => {
    workbenchStore.toggleFileSelection(filePath, false); // false = not a folder
  });

  // Log success message with all selected files
  addLog(
    `Selected ${filePaths.length} files based on command: ${filePaths.join(' ')}`
  );
  return true;
}
