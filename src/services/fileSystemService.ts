// AI Summary: Manages high-level file system operations by delegating to the electron IPC layer.
// Handles reading file contents, listing items, and bridging to ignore logic through addToIgnore.
// Tree-building, athignore creation, and file content utilities have been refactored into separate modules.

import { FileItem } from '../utils/fileTree';
import { FILE_SYSTEM } from '../utils/constants';

/**
 * Read file content (with default UTF-8 encoding) and normalize it.
 */
export async function readFileContent(path: string): Promise<string> {
  try {
    const content = await window.fileSystem.readFile(path, { encoding: 'utf8' });
    // The normalization logic is now in fileContentUtils.ts
    // We'll do a simple type cast here; caller can handle normalization if needed
    return content as string;
  } catch (error) {
    console.error(`Error reading file ${path}:`, error);
    throw error;
  }
}

/**
 * Read file content by a project-relative path, returning UTF-8 text.
 */
export async function readFileByPath(relativePath: string): Promise<string> {
  try {
    const currentDir = await window.fileSystem.getCurrentDirectory();
    const combinedPath = await window.fileSystem.joinPaths(currentDir, relativePath);
    const fullPath = await window.fileSystem.toOSPath(combinedPath);
    const content = await window.fileSystem.readFile(fullPath, { encoding: 'utf8' });
    return content as string;
  } catch (error) {
    console.error(`Error reading file ${relativePath}:`, error);
    throw error;
  }
}

/**
 * Get all files in a file tree, returning an array of file paths.
 * Note: Tree building is performed in fileTreeBuilder.ts
 */
export function getAllFiles(tree: FileItem): string[] {
  if (tree.type === 'file') {
    return [tree.path];
  }
  return (tree.children || []).flatMap(getAllFiles);
}

/**
 * Get all folders in a file tree, returning an array of folder paths.
 */
export function getAllFolders(tree: FileItem): string[] {
  if (tree.type === 'file') {
    return [];
  }
  const folders = [tree.path];
  return folders.concat((tree.children || []).flatMap(getAllFolders));
}

/**
 * Find a file/folder in the tree by path, returning the matching FileItem or null.
 */
export function findItemByPath(tree: FileItem, targetPath: string): FileItem | null {
  if (tree.path === targetPath) {
    return tree;
  }
  if (tree.type === 'folder' && tree.children) {
    for (const child of tree.children) {
      const found = findItemByPath(child, targetPath);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Update a specific item in the tree by path, merging the provided updates.
 */
export function updateItemInTree(
  tree: FileItem,
  targetPath: string,
  updates: Partial<FileItem>
): FileItem {
  if (tree.path === targetPath) {
    return { ...tree, ...updates };
  }
  if (tree.type === 'folder' && tree.children) {
    return {
      ...tree,
      children: tree.children.map((child) =>
        updateItemInTree(child, targetPath, updates)
      ),
    };
  }
  return tree;
}

/**
 * Add a path to .athignore by delegating to Electron's addToIgnore method.
 */
export async function addToIgnore(itemPath: string, ignoreAll = false): Promise<boolean> {
  try {
    return await window.fileSystem.addToIgnore(itemPath, ignoreAll);
  } catch (error) {
    console.error(`Error adding path to ignore: ${itemPath}`, error);
    throw error;
  }
}
