// AI Summary: Provides the buildFileTree function to recursively construct a file tree,
// applying ignore rules as needed. Depends on fileContentUtils for line counting.

import { FILE_SYSTEM } from '../utils/constants';
import { FileItem, sortItems } from '../utils/fileTree';
import { normalizeContent, countFileLines } from './fileContentUtils';

export async function buildFileTree(
  basePath: string,
  currentPath: string = '',
  isMaterialsTree: boolean = false,
  applyIgnores: boolean = true
): Promise<FileItem> {
  // Construct the full path by joining base and current paths
  const fullPath = await window.fileSystem.joinPaths(basePath, currentPath);
  // Get the name from the last part of the current path, or base path if at root
  let name = currentPath
    ? currentPath.split('/').pop() || ''
    : basePath.split('/').pop() || '';

  // Set root name for supplementary materials tree
  if (isMaterialsTree && !currentPath) {
    name = 'Supplementary Materials';
  }

  try {
    const isDir = await window.fileSystem.isDirectory(fullPath);
    // Generate ID relative to base path
    const id = isMaterialsTree
      ? `materials:${currentPath}`
      : currentPath || '/';

    if (!isDir) {
      const lineCount = await countFileLines(fullPath);
      return {
        id,
        name,
        type: 'file',
        path: fullPath,
        lineCount,
      };
    }

    const entries = await window.fileSystem.readDirectory(fullPath, applyIgnores);
    const children: FileItem[] = [];

    for (const entry of entries) {
      // Skip supplementary materials directory in main tree to avoid recursion
      if (!isMaterialsTree && entry === FILE_SYSTEM.materialsDirName) {
        continue;
      }
      // Build the relative path for the child
      const childRelativePath = currentPath ? `${currentPath}/${entry}` : entry;

      // Skip if somehow we got into a recursive path
      if (childRelativePath === currentPath) {
        console.warn('Skipping recursive path for', childRelativePath);
        continue;
      }

      // Recursive call
      const child = await buildFileTree(
        basePath,
        childRelativePath,
        isMaterialsTree,
        applyIgnores
      );
      children.push(child);
    }

    // Sort children with folders first, then files
    const sortedChildren = sortItems(children);

    // Check if folder is empty or has only empty subfolders
    const hasOnlyEmptyFolders = sortedChildren.every(
      (child) =>
        child.type === 'folder' && (child.isEmpty || !child.children?.length)
    );
    const isEmpty = sortedChildren.length === 0 || hasOnlyEmptyFolders;

    return {
      id,
      name,
      type: 'folder',
      path: fullPath,
      children: sortedChildren,
      isEmpty,
    };
  } catch (error) {
    console.error(`Error building file tree for ${fullPath}:`, error);
    return {
      id: fullPath,
      name,
      type: 'file',
      path: fullPath,
      error: true,
    };
  }
}
