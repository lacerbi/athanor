// AI Summary: Core utilities for file tree structure, traversal, and basic operations.
// Handles sorting, path handling, empty folder detection, and file size analysis.
// Provides functions for tree traversal and item lookup with proper error handling.
export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  error?: boolean;
  isEmpty?: boolean;
  children?: FileItem[];
  lineCount?: number;
}

// Get all valid item IDs from a file tree
export function getAllValidIds(item: FileItem): Set<string> {
  const validIds = new Set<string>();

  if (item.type === 'file') {
    validIds.add(item.id);
    return validIds;
  }

  if (item.children) {
    item.children.forEach((child) => {
      getAllValidIds(child).forEach((id) => validIds.add(id));
    });
  }

  return validIds;
}

// Find a file item by ID
export function getFileItemById(id: string, items: FileItem[]): FileItem | null {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }
    if (item.children) {
      const found = getFileItemById(id, item.children);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

// Sort folders before files, and by name within each type
export function sortItems(items: FileItem[]): FileItem[] {
  if (!Array.isArray(items)) return items;
  return items.sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }
    return a.type === 'folder' ? -1 : 1;
  });
}

// Get all descendant IDs recursively (files and folders)
export function getAllDescendantIds(item: FileItem): string[] {
  const ids = [item.id];
  if (item.children) {
    item.children.forEach((child) => {
      ids.push(...getAllDescendantIds(child));
    });
  }
  return ids;
}

// Check if folder is empty (no children or only empty folders)
export function isEmptyFolder(item: FileItem): boolean {
  if (item.type === 'file') return false;
  if (!item.children?.length) return true;
  return item.children.every(
    (child) => child.type === 'folder' && isEmptyFolder(child)
  );
}

// Get all file IDs in a tree
export function getAllFileIds(item: FileItem): string[] {
  if (item.type === 'file') {
    return [item.id];
  }
  return (item.children || []).flatMap(getAllFileIds);
}

// Helper function to get base name from path
export function getBaseName(path: string): string {
  const normalizedPath = path.replace(/\\/g, '/');
  const cleanPath = normalizedPath.endsWith('/')
    ? normalizedPath.slice(0, -1)
    : normalizedPath;
  const parts = cleanPath.split('/');
  return parts[parts.length - 1] || cleanPath;
}
