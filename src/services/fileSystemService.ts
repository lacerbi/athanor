// AI Summary: Core file system service that builds and maintains the application's file tree structure.
// Now uses fileService and pathUtils for all file operations and path manipulation.
// Handles directory traversal, line counting, and content normalization with proper error handling.
import {
  FileItem,
  sortItems,
  isEmptyFolder,
  getFileItemById,
} from '../utils/fileTree';
import { FILE_SYSTEM } from '../utils/constants';

// Function to normalize content with consistent line endings
function normalizeContent(content: string): string {
  return (
    content
      .replace(/\r\n/g, '\n') // Convert Windows line endings to Unix
      .replace(/\r/g, '\n') // Convert old Mac line endings to Unix
      .split('\n')
      .map((line) => line.trimEnd()) // Remove trailing whitespace from each line
      .join('\n')
      .trim() + '\n'
  ); // Ensure single trailing newline
}

// Function to count lines in a file
async function countFileLines(path: string): Promise<number> {
  try {
    const content = await window.fileService.read(path, {
      encoding: 'utf8',
    });
    // Count lines after normalizing line endings
    return normalizeContent(content as string).split('\n').length;
  } catch (error) {
    console.error(`Error counting lines in file ${path}:`, error);
    return 0;
  }
}

export async function buildFileTree(
  basePath: string,
  currentPath: string = '',
  isMaterialsTree: boolean = false,
  applyIgnores: boolean = true
): Promise<FileItem> {
  // Construct the full path by joining base and current paths
  const fullPath = await window.pathUtils.join(basePath, currentPath);
  // Get the name from the last part of the current path, or base path if at root
  let name = currentPath
    ? currentPath.split('/').pop() || ''
    : basePath.split('/').pop() || '';

  // Set root name for supplementary materials tree
  if (isMaterialsTree && !currentPath) {
    name = 'Supplementary Materials';
  }

  try {
    const isDir = await window.fileService.isDirectory(fullPath);
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

    const entries = await window.fileService.readDirectory(
      fullPath,
      applyIgnores
    );
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

      // Recursive call with the same base path but updated relative path
      const child = await buildFileTree(
        basePath,
        childRelativePath,
        isMaterialsTree,
        applyIgnores
      );
      children.push(child);
    }

    // Sort children with folders first, then files, both in lexicographic order
    const sortedChildren = sortItems(children);

    // Determine if this is an empty folder (no files, only empty folders)
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

// Read file content with normalization
export async function readFileContent(path: string): Promise<string> {
  try {
    const content = await window.fileService.read(path, {
      encoding: 'utf8',
    });
    return normalizeContent(content as string);
  } catch (error) {
    console.error(`Error reading file ${path}:`, error);
    throw error;
  }
}

// Read file content by relative path within project
export async function readFileByPath(relativePath: string): Promise<string> {
  try {
    // Convert to OS-specific format if needed
    const fullPath = await window.fileService.resolve(relativePath);

    // Read and return the file content
    const content = await window.fileService.read(relativePath, {
      encoding: 'utf8',
    });
    return normalizeContent(content as string);
  } catch (error) {
    console.error(`Error reading file ${relativePath}:`, error);
    throw error;
  }
}

// Function to get all files in a tree
export function getAllFiles(tree: FileItem): string[] {
  if (tree.type === 'file') {
    return [tree.path];
  }

  return (tree.children || []).flatMap(getAllFiles);
}

// Function to get all folders in a tree
export function getAllFolders(tree: FileItem): string[] {
  if (tree.type === 'file') {
    return [];
  }

  const folders = [tree.path];
  return folders.concat((tree.children || []).flatMap(getAllFolders));
}

// Function to find a file/folder in the tree by path
export function findItemByPath(
  tree: FileItem,
  targetPath: string
): FileItem | null {
  if (tree.path === targetPath) {
    return tree;
  }

  if (tree.type === 'folder' && tree.children) {
    for (const child of tree.children) {
      const found = findItemByPath(child, targetPath);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

// Function to update a specific item in the tree
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
