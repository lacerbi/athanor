// AI Summary: Custom hook for managing file explorer state including folder expansion,
// context menu, and file system operations. Centralizes file explorer logic and state.
import { useState, useCallback, useRef, useEffect } from 'react';
import { FileItem } from '../../../utils/fileTree';

export interface ContextMenuState {
  x: number;
  y: number;
  item: FileItem;
}

export function useFileExplorer(items: FileItem[], onRefresh: () => void) {
  // Initialize with root folder expanded
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    if (items.length === 1 && items[0].type === 'folder') {
      return new Set([items[0].id]);
    }
    return new Set();
  });

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [currentDirectory, setCurrentDirectory] = useState<string>('');
  const explorerRef = useRef<HTMLDivElement>(null);

  // Load current directory
  useEffect(() => {
    const loadCurrentDirectory = async () => {
      const dir = await window.fileSystem.getCurrentDirectory();
      setCurrentDirectory(dir);
    };
    loadCurrentDirectory();
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleIgnoreItem = async (itemPath: string, ignoreAll: boolean) => {
    try {
      const success = await window.fileSystem.addToIgnore(itemPath);
      if (success) {
        onRefresh();
      }
      handleCloseContextMenu();
    } catch (error) {
      console.error('Error adding item to ignore:', error);
    }
  };

  const toggleFolder = (itemId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    handleCloseContextMenu();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item: item,
    });
  };

  // Add document-level click handler
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (
        explorerRef.current &&
        !explorerRef.current.contains(e.target as Node)
      ) {
        handleCloseContextMenu();
      }
    };

    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [handleCloseContextMenu]);

  return {
    explorerRef,
    expandedFolders,
    contextMenu,
    currentDirectory,
    handleIgnoreItem,
    toggleFolder,
    handleContextMenu,
    handleCloseContextMenu,
  };
}
