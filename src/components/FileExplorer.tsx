// AI Summary: File explorer component with recursive file tree navigation and selection.
// Handles file/folder selection, context menus, and ignore operations.
// Manages tree expansion state and integrates with file system monitoring.
import React, { useState, useRef, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  Scissors,
  Book,
} from 'lucide-react';
import { FileItem, getBaseName, isEmptyFolder } from '../utils/fileTree';
import { FILE_SYSTEM } from '../utils/constants';
import {
  areAllDescendantsSelected,
  areSomeDescendantsSelected,
} from '../utils/fileSelection';
import { useFileSystemStore } from '../stores/fileSystemStore';
import FileContextMenu from './FileContextMenu';

interface FileExplorerItemProps {
  item: FileItem;
  level: number;
  isRoot?: boolean;
  expandedFolders: Set<string>;
  onToggleFolder: (itemId: string) => void;
  onViewFile: () => void;
  onContextMenu: (e: React.MouseEvent, item: FileItem) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  item: FileItem;
}

const FileExplorerItem: React.FC<FileExplorerItemProps> = ({
  item,
  level,
  isRoot = false,
  expandedFolders,
  onToggleFolder,
  onViewFile,
  onContextMenu,
}) => {
  const {
    selectedItems,
    toggleItemSelection,
    previewedFilePath,
    setPreviewedFilePath,
  } = useFileSystemStore();
  const checkboxRef = React.useRef<HTMLInputElement>(null);
  const isExpanded = expandedFolders.has(item.id);
  const hasSelectedDescendants = areSomeDescendantsSelected(
    item,
    selectedItems
  );
  const allDescendantsSelected = areAllDescendantsSelected(item, selectedItems);
  const isEmpty = isEmptyFolder(item);
  const isCurrentlyViewed = item.path === previewedFilePath;
  const isLongFile =
    item.type === 'file' &&
    item.lineCount &&
    item.lineCount > FILE_SYSTEM.thresholdLineLength;

  // Handle checkbox indeterminate state
  React.useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate =
        hasSelectedDescendants && !allDescendantsSelected;
    }
  }, [hasSelectedDescendants, allDescendantsSelected]);

  // Get the display name - for root level, handle resources directory specially
  const displayName =
    isRoot && item.path.endsWith(FILE_SYSTEM.resourcesDirName)
      ? 'External Resources'
      : isRoot
        ? getBaseName(item.path)
        : item.name;

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleItemSelection(item);
  };

  const handleFileClick = (e: React.MouseEvent) => {
    // Only trigger file view if clicking the name or icon
    const target = e.target as HTMLElement;
    const isNameOrIcon =
      target.classList.contains('file-name') ||
      target.classList.contains('file-icon') ||
      target.closest('.file-icon-wrapper');

    if (isNameOrIcon && item.type === 'file') {
      setPreviewedFilePath(item.path);
      onViewFile();
    }
  };

  const handleItemContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(e, item);
  };

  return (
    <div className="select-none" style={{ marginLeft: `${level * 20}px` }}>
      <div
        className={`flex items-center py-1 hover:bg-gray-100`}
        onClick={handleFileClick}
        onContextMenu={handleItemContextMenu}
      >
        {/* Checkbox or placeholder */}
        <div className="w-5 flex-shrink-0" onClick={handleCheckboxClick}>
          {!isEmpty && (
            <input
              ref={checkboxRef}
              type="checkbox"
              checked={allDescendantsSelected}
              onChange={() => {}} // Handle in onClick instead
              className="cursor-pointer"
            />
          )}
        </div>

        {/* Folder expand/collapse button or spacer */}
        {item.type === 'folder' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFolder(item.id);
            }}
            className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronDown size={16} className="flex-shrink-0" />
            ) : (
              <ChevronRight size={16} className="flex-shrink-0" />
            )}
          </button>
        ) : (
          <span className="w-6 flex-shrink-0" />
        )}

        {/* File/Folder icon */}
        <div className="flex-shrink-0 mr-2 file-icon-wrapper cursor-pointer">
          {level === 0 && item.name === 'External Resources' ? (
            <Book size={16} className="text-purple-600" />
          ) : item.type === 'folder' ? (
            <Folder size={16} />
          ) : (
            <File size={16} className="file-icon" />
          )}
        </div>

        {/* Filename */}
        <span
          className={`truncate file-name cursor-pointer
            ${isRoot ? 'font-bold' : ''}
            ${isCurrentlyViewed ? 'font-bold text-blue-600' : ''}
          `}
        >
          {displayName}
          {item.type === 'folder' ? '/' : ''}
        </span>

        {/* Scissors icon for long files */}
        {isLongFile && (
          <div
            className="ml-2 text-gray-500"
            title={`File has ${item.lineCount} lines (threshold: ${FILE_SYSTEM.thresholdLineLength})`}
          >
            <Scissors size={14} />
          </div>
        )}
      </div>

      {item.type === 'folder' &&
        isExpanded &&
        item.children &&
        item.children.length > 0 && (
          <div>
            {item.children.map((child) => (
              <FileExplorerItem
                key={child.id}
                item={child}
                level={level + 1}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                onViewFile={onViewFile}
                onContextMenu={onContextMenu}
              />
            ))}
          </div>
        )}
    </div>
  );
};

interface FileExplorerProps {
  items: FileItem[];
  level?: number;
  onViewFile?: () => void;
  onRefresh?: () => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
  items,
  level = 0,
  onViewFile = () => {},
  onRefresh = () => {},
}) => {
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
  const { validateSelections } = useFileSystemStore();

  // Load current directory
  React.useEffect(() => {
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
        // Trigger refresh using the parent's refresh handler
        onRefresh();
      }
      handleCloseContextMenu();
    } catch (error) {
      console.error('Error adding item to ignore:', error);
    }
  };

  // Handle mouse leave for the entire explorer
  const handleMouseLeave = () => {
    handleCloseContextMenu();
  };

  // Handle new context menu
  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    // Close any existing menu first
    handleCloseContextMenu();
    // Open new menu
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item: item,
    });
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

  // Add document-level click handler
  React.useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Close menu if clicking outside the explorer
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

  return (
    <div
      ref={explorerRef}
      className="select-none relative h-full overflow-y-auto scrollbar-thin"
      onMouseLeave={handleMouseLeave}
    >
      {items.map((item) => (
        <FileExplorerItem
          key={item.id}
          item={item}
          level={level}
          isRoot={level === 0}
          expandedFolders={expandedFolders}
          onToggleFolder={toggleFolder}
          onViewFile={onViewFile}
          onContextMenu={handleContextMenu}
        />
      ))}

      {contextMenu && (
        <FileContextMenu
          type={contextMenu.item.type}
          name={contextMenu.item.name}
          path={contextMenu.item.path}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleCloseContextMenu}
          onIgnoreItem={handleIgnoreItem}
        />
      )}
    </div>
  );
};

export default FileExplorer;
