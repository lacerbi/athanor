// AI Summary: Handles rendering of individual file/folder items in the explorer tree.
// Manages item selection, expansion toggling, and context menu integration.
import React from 'react';
import { ChevronRight, ChevronDown, File, Scissors, Book } from 'lucide-react';
import { FileItem, getBaseName, isEmptyFolder } from '../../utils/fileTree';
import { FILE_SYSTEM } from '../../utils/constants';
import {
  areAllDescendantsSelected,
  areSomeDescendantsSelected,
} from '../../utils/fileSelection';
import { useFileSystemStore } from '../../stores/fileSystemStore';

interface FileExplorerItemProps {
  item: FileItem;
  level: number;
  isRoot?: boolean;
  expandedFolders: Set<string>;
  onToggleFolder: (itemId: string) => void;
  onViewFile: () => void;
  onContextMenu: (e: React.MouseEvent, item: FileItem) => void;
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

  return (
    <div className="select-none" style={{ paddingLeft: level ? '25px' : '0' }}>
      <div
        className={`flex items-center py-1 hover:bg-gray-100`}
        onClick={handleFileClick}
        onContextMenu={(e) => onContextMenu(e, item)}
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

        {/* Folder expand/collapse button or file icon */}
        <div className="flex-shrink-0">
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
          ) : level === 0 && item.name === 'External Resources' ? (
            <div className="p-1">
              <Book size={16} className="text-purple-600" />
            </div>
          ) : (
            <div className="p-1">
              <File size={16} className="file-icon" />
            </div>
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

      {/* Render children recursively if expanded */}
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

export default FileExplorerItem;
