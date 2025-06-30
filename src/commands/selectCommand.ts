// AI Summary: Handles selection of files based on provided paths with workbench store integration.
// Validates paths and updates active tab selection state while providing logging feedback.
import { useWorkbenchStore } from '../stores/workbenchStore';
import { useFileSystemStore } from '../stores/fileSystemStore';
import { getFileItemById } from '../utils/fileTree';

export interface SelectCommandParams {
  content: string;
  addLog: (message: string) => void;
}

export async function executeSelectCommand({
  content,
  addLog,
}: SelectCommandParams): Promise<boolean> {
  const { setSelection } = useWorkbenchStore.getState();
  const { fileTree } = useFileSystemStore.getState();

  const filePaths = content
    .trim()
    .split(/\s+/)
    .filter((path) => path.length > 0);

  const validFilePaths = filePaths.filter((path) => {
    const item = getFileItemById(path, fileTree);
    if (!item) {
      console.warn(`Select command: file not found in tree: ${path}`);
      return false;
    }
    if (item.type === 'folder') {
      console.warn(
        `Select command: attempted to select a folder, which is not allowed: ${path}`
      );
      return false;
    }
    return true; // It's a file that exists in the tree
  });

  // Directly set the validated selection. This is an atomic operation.
  setSelection(validFilePaths);

  const originalCount = filePaths.length;
  const validCount = validFilePaths.length;

  if (validCount === originalCount) {
    if (validCount > 0) {
      addLog(`Selected ${validCount} file(s) as requested.`);
    } else {
      addLog(`Select command found no valid files to select.`);
    }
  } else {
    addLog(
      `Selected ${validCount} of ${originalCount} requested file(s). Ignored ${originalCount - validCount} invalid or non-existent paths.`
    );
  }

  return true;
}