// AI Summary: Provides file system operations including reading directory structure,
// building the file tree, analyzing file contents, and an updated addToIgnore method
// that supports an ignoreAll parameter for .athignore entries.

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
    const content = await window.fileSystem.readFile(path, {
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
    const content = await window.fileSystem.readFile(path, {
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
    // Get current directory and let filePathManager handle path joining
    const currentDir = await window.fileSystem.getCurrentDirectory();
    const combinedPath = await window.fileSystem.joinPaths(
      currentDir,
      relativePath
    );

    // Convert to OS-specific format via filePathManager
    const fullPath = await window.fileSystem.toOSPath(combinedPath);

    // Read and return the file content
    const content = await window.fileSystem.readFile(fullPath, {
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

// Updated addToIgnore method accepting ignoreAll
interface AthignoreOptions {
  useStandardIgnore: boolean;
  importGitignore: boolean;
}

export async function createAthignoreFile(
  projectPath: string,
  options: AthignoreOptions
): Promise<void> {
  try {
    // Read the default athignore content
    const defaultAthignorePath = await window.fileSystem.getResourcesPath();
    const defaultContent = await window.fileSystem.readFile(
      await window.fileSystem.joinPaths(defaultAthignorePath, 'files/default_athignore'),
      { encoding: 'utf8' }
    ) as string;

    let finalContent = '';

    // If using standard ignore rules, use the entire default content
    if (options.useStandardIgnore) {
      finalContent = defaultContent;
    } else {
      // Extract only the initial comment header (everything up to first blank line)
      finalContent = defaultContent.split(/\n\s*\n/)[0] + '\n\n';
    }

    // If importing from .gitignore and it exists, add those patterns in a new section
    if (options.importGitignore) {
      const gitignorePath = await window.fileSystem.joinPaths(projectPath, '.gitignore');
      const exists = await window.fileSystem.fileExists(gitignorePath);
      
      if (exists) {
        const gitignoreContent = await window.fileSystem.readFile(gitignorePath, {
          encoding: 'utf8',
        }) as string;
        
        // Get lines from .gitignore
        const gitignoreLines = gitignoreContent.split('\n')
          .map(line => line.trim())
          .filter(line => line); // Remove empty lines

        // Get existing lines from default content if we're using it
        const existingLines = options.useStandardIgnore 
          ? defaultContent.split('\n').map(line => line.trim())
          : [];

        // Filter out duplicates
        const uniqueGitignoreLines = gitignoreLines.filter(
          line => !existingLines.includes(line)
        );

        if (uniqueGitignoreLines.length > 0) {
          // Add .gitignore section header
          finalContent += '\n###############################################################################\n';
          finalContent += '# IMPORTED FROM .gitignore\n';
          finalContent += '# These files were imported from .gitignore at creation.\n';
          finalContent += '# These are NOT updated automatically if .gitignore is later changed.\n';
          finalContent += '###############################################################################\n\n';
          
          // Add unique lines
          finalContent += uniqueGitignoreLines.join('\n') + '\n';
        }
      }
    }

    // Always add the project files section at the end
    finalContent += '\n###############################################################################\n';
    finalContent += '# PROJECT FILES\n';
    finalContent += '# Add below specific files and folders you want to ignore.\n';
    finalContent += '###############################################################################\n';

    // Write the .athignore file
    await window.fileSystem.writeFile('.athignore', finalContent);
  } catch (error) {
    console.error('Error creating .athignore:', error);
    throw error;
  }
}

export async function addToIgnore(itemPath: string, ignoreAll: boolean = false): Promise<boolean> {
  try {
    return await window.fileSystem.addToIgnore(itemPath, ignoreAll);
  } catch (error) {
    console.error(`Error adding path to ignore: ${itemPath}`, error);
    throw error;
  }
}
