// AI Summary: Utilities for handling file selection logic, including getting selectable items
// and checking selection states of files and folders. Provides functions for calculating
// selection totals and managing selectable items.
import { FileItem, isEmptyFolder, getFileItemById } from './fileTree';

// Get selectable descendants (non-empty folders and files)
export function getSelectableDescendants(item: FileItem): string[] {
  if (item.type === 'file') {
    return [item.id];
  }

  if (!item.children?.length || isEmptyFolder(item)) {
    return [];
  }

  const selectableIds: string[] = [];
  item.children.forEach((child) => {
    selectableIds.push(...getSelectableDescendants(child));
  });

  return selectableIds;
}

// Check if all descendants are selected
export function areAllDescendantsSelected(
  item: FileItem,
  selectedItems: Set<string>
): boolean {
  if (item.type === 'file') {
    return selectedItems.has(item.id);
  }

  if (!item.children?.length || isEmptyFolder(item)) {
    return false;
  }

  const selectableDescendants = getSelectableDescendants(item);
  return (
    selectableDescendants.length > 0 &&
    selectableDescendants.every((id) => selectedItems.has(id))
  );
}

// Check if any descendants are selected
export function areSomeDescendantsSelected(
  item: FileItem,
  selectedItems: Set<string>
): boolean {
  if (item.type === 'file') {
    return selectedItems.has(item.id);
  }

  if (!item.children?.length || isEmptyFolder(item)) {
    return false;
  }

  const selectableDescendants = getSelectableDescendants(item);
  return selectableDescendants.some((id) => selectedItems.has(id));
}

// Calculate total lines across selected files
export function calculateSelectionTotals(selectedItems: Set<string> | string[], fileTree: FileItem[]): number {
  if (!fileTree || fileTree.length === 0) return 0;
  let total = 0;
  
  // Convert array to Set if needed for consistent iteration
  const selectedSet = Array.isArray(selectedItems) ? new Set(selectedItems) : selectedItems;
  
  selectedSet.forEach((id) => {
    const item = getFileItemById(id, fileTree);
    if (item?.type === 'file' && item.lineCount) {
      total += item.lineCount;
    }
  });
  
  return total;
}
