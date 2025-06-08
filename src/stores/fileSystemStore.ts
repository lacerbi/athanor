// AI Summary: Manages file system state including file selection, previewed file path, and selection metrics.
// Tracks count of selected files and total lines across selections. Handles recursive selection of files and folders.
import { create } from 'zustand';
import { FileItem } from '../utils/fileTree';
import { DOC_FORMAT } from '../utils/constants';
import { AthanorConfig } from '../types/global';

interface FileSystemState {
  // File tree state
  fileTree: FileItem[];
  setFileTree: (tree: FileItem[]) => void;

  // Effective configuration (includes settings overrides)
  effectiveConfig: AthanorConfig | null;
  setEffectiveConfig: (config: AthanorConfig | null) => void;

  // Preview file path
  previewedFilePath: string | null;
  setPreviewedFilePath: (path: string | null) => void;

  // Smart preview setting
  smartPreviewEnabled: boolean;
  toggleSmartPreview: () => void;
  
  // File tree inclusion setting
  includeFileTree: boolean;
  toggleFileTree: () => void;
  
  // Format type setting
  formatType: string;
  toggleFormatType: () => void;
  
  // Project info inclusion setting
  includeProjectInfo: boolean;
  toggleProjectInfo: () => void;

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
  
  effectiveConfig: null,
  setEffectiveConfig: (config: AthanorConfig | null) => set({ effectiveConfig: config }),
  
  resetState: () => {
    return set({      
      // Clear UI state
      previewedFilePath: null,
      isRefreshing: false,
      
      // Clear file system state
      fileTree: [],
      
      // Clear effective configuration
      effectiveConfig: null,
      
      // Keep smart preview and file tree enabled by default
      smartPreviewEnabled: true,
      includeFileTree: true,
      includeProjectInfo: true,
      formatType: DOC_FORMAT.DEFAULT || DOC_FORMAT.XML, // Default to XML format
    });
  },

  // Smart preview setting (true = include non-selected files with truncated preview)
  smartPreviewEnabled: true,
  toggleSmartPreview: () => set((state) => ({ 
    smartPreviewEnabled: !state.smartPreviewEnabled 
  })),
  
  // File tree inclusion setting (true = include file tree in generated prompt)
  includeFileTree: true,
  toggleFileTree: () => set((state) => ({
    includeFileTree: !state.includeFileTree
  })),
  
  // Format type setting (XML or Markdown)
  formatType: DOC_FORMAT.DEFAULT || DOC_FORMAT.XML,
  toggleFormatType: () => set((state) => ({
    formatType: state.formatType === DOC_FORMAT.XML ? DOC_FORMAT.MARKDOWN : DOC_FORMAT.XML
  })),
  
  // Project info inclusion setting (true = include project info in generated prompt)
  includeProjectInfo: true,
  toggleProjectInfo: () => set((state) => ({
    includeProjectInfo: !state.includeProjectInfo
  })),


  previewedFilePath: null,
  setPreviewedFilePath: (path: string | null) =>
    set({ previewedFilePath: path }),
}));
