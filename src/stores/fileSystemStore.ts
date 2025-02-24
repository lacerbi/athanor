// AI Summary: Manages file system state including file selection, previewed file path, and selection metrics.
// Tracks count of selected files and total lines across selections. Handles recursive selection of files and folders.
import { create } from 'zustand';
import { FileItem, isEmptyFolder, getAllValidIds, getFileItemById } from '../utils/fileTree';
import { getSelectableDescendants, calculateSelectionTotals } from '../utils/fileSelection';

interface FileSystemState {
  selectedItems: Set<string>;
  selectItems: (ids: string[]) => void;
  unselectItems: (ids: string[]) => void;
  toggleItemSelection: (item: FileItem) => void;
  clearSelections: () => void;
  validateSelections: (rootItem: FileItem) => void;
  getSelectedItems: () => Set<string>;

  // File tree state
  fileTree: FileItem[];
  setFileTree: (tree: FileItem[]) => void;

  // Selection metrics
  selectedFileCount: number;
  selectedLinesTotal: number;
  getSelectedFileCount: () => number;
  getSelectedLinesTotal: () => number;

  // Preview file path
  previewedFilePath: string | null;
  setPreviewedFilePath: (path: string | null) => void;

  // Smart preview setting
  smartPreviewEnabled: boolean;
  toggleSmartPreview: () => void;

  // Refresh state
  isRefreshing: boolean;
  setIsRefreshing: (refreshing: boolean) => void;
  resetState: () => void;
}

export const useFileSystemStore = create<FileSystemState>((set, get) => ({
  isRefreshing: false,
  setIsRefreshing: (refreshing: boolean) => set({ isRefreshing: refreshing }),
  
  fileTree: [],
  setFileTree: (tree: FileItem[]) => set({ fileTree: tree }),
  
  resetState: () => {
    return set({
      // Clear selection state
      selectedItems: new Set(),
      selectedFileCount: 0,
      selectedLinesTotal: 0,
      
      // Clear UI state
      previewedFilePath: null,
      isRefreshing: false,
      
      // Clear file system state
      fileTree: [],
      
      // Keep smart preview enabled by default
      smartPreviewEnabled: true,
    });
  },
  
  selectedItems: new Set<string>(),
  selectedFileCount: 0,
  selectedLinesTotal: 0,

  getSelectedFileCount: () => get().selectedFileCount,
  getSelectedLinesTotal: () => get().selectedLinesTotal,

  // Smart preview setting (true = include non-selected files with truncated preview)
  smartPreviewEnabled: true,
  toggleSmartPreview: () => set((state) => ({ 
    smartPreviewEnabled: !state.smartPreviewEnabled 
  })),

  selectItems: (ids: string[]) =>
    set((state) => {
      const newSet = new Set(state.selectedItems);
      ids.forEach((id) => newSet.add(id));
      return { 
        selectedItems: newSet,
        selectedFileCount: newSet.size,
        selectedLinesTotal: calculateSelectionTotals(newSet, state.fileTree)
      };
    }),

  unselectItems: (ids: string[]) =>
    set((state) => {
      const newSet = new Set(state.selectedItems);
      ids.forEach((id) => newSet.delete(id));
      return { 
        selectedItems: newSet,
        selectedFileCount: newSet.size,
        selectedLinesTotal: calculateSelectionTotals(newSet, state.fileTree)
      };
    }),

  toggleItemSelection: (item: FileItem) =>
    set((state) => {
      if (isEmptyFolder(item)) {
        return state;
      }

      const selectableIds = getSelectableDescendants(item);
      if (selectableIds.length === 0) {
        return state;
      }

      const allSelected = selectableIds.every((id) =>
        state.selectedItems.has(id)
      );
      const newSet = new Set(state.selectedItems);

      if (allSelected) {
        selectableIds.forEach((id) => newSet.delete(id));
      } else {
        selectableIds.forEach((id) => newSet.add(id));
      }

      return { 
        selectedItems: newSet,
        selectedFileCount: newSet.size,
        selectedLinesTotal: calculateSelectionTotals(newSet, state.fileTree)
      };
    }),

  clearSelections: () => set({ 
    selectedItems: new Set(),
    selectedFileCount: 0,
    selectedLinesTotal: 0
  }),

  validateSelections: (rootItem: FileItem) =>
    set((state) => {
      const validIds = getAllValidIds(rootItem);
      const newSelectedItems = new Set(
        Array.from(state.selectedItems).filter((id) => validIds.has(id))
      );
      return { 
        selectedItems: newSelectedItems,
        selectedFileCount: newSelectedItems.size,
        selectedLinesTotal: calculateSelectionTotals(newSelectedItems, state.fileTree)
      };
    }),

  getSelectedItems: () => get().selectedItems,

  previewedFilePath: null,
  setPreviewedFilePath: (path: string | null) =>
    set({ previewedFilePath: path }),
}));
