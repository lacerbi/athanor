// AI Summary: Handles rendering of individual file/folder items in the explorer tree.
// Manages item selection, expansion toggling, and context menu integration.
import React, { useState } from 'react';
import { ChevronRight, ChevronDown, File, Scissors, Book } from 'lucide-react';
import { FileItem, getBaseName, isEmptyFolder } from '../../utils/fileTree';
import {
  FILE_SYSTEM,
  SETTINGS,
  DRAG_DROP,
  CONTEXT_BUILDER,
} from '../../utils/constants';
import {
  areAllDescendantsSelected,
  areSomeDescendantsSelected,
} from '../../utils/fileSelection';
import { useFileSystemStore } from '../../stores/fileSystemStore';
import { useWorkbenchStore } from '../../stores/workbenchStore';
import { useSettingsStore } from '../../stores/settingsStore'; // Added settings store
import { useContextStore } from '../../stores/contextStore';
import useDarkMode from '../../hooks/useDarkMode';

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
  const [isDragging, setIsDragging] = useState(false);
  const { previewedFilePath, setPreviewedFilePath, fileTree } =
    useFileSystemStore();
  const { tabs, activeTabIndex, toggleFileSelection } = useWorkbenchStore();
  const { applicationSettings } = useSettingsStore(); // Get application settings
  const {
    selectedFiles: contextSelected,
    heuristicSeedFiles,
    neighboringFiles,
    maxNeighborScore,
  } = useContextStore();
  const isDarkMode = useDarkMode();
  const checkboxRef = React.useRef<HTMLInputElement>(null);

  const appDefaults = SETTINGS.defaults.application;
  const currentThresholdLineLength =
    applicationSettings?.thresholdLineLength ?? appDefaults.thresholdLineLength;

  // Determine the context tier for visual styling
  const isContextSelected = contextSelected.has(item.id);
  const isHeuristicSeed = heuristicSeedFiles.some(seed => seed.path === item.id);
  const relevanceScore = neighboringFiles.get(item.id);
  const isNeighboring = relevanceScore !== undefined;

  // Get current tab's selected files
  const activeTab = tabs[activeTabIndex];
  const selectedFiles = activeTab?.selectedFiles || [];

  // Convert to Set for efficient O(1) lookups in selection checks
  const selectedFilesSet = new Set(selectedFiles);

  const isExpanded = expandedFolders.has(item.id);
  const hasSelectedDescendants = areSomeDescendantsSelected(
    item,
    selectedFilesSet
  );
  const allDescendantsSelected = areAllDescendantsSelected(
    item,
    selectedFilesSet
  );
  const isEmpty = isEmptyFolder(item);
  const isCurrentlyViewed = item.path === previewedFilePath;
  const isLongFile =
    item.type === 'file' &&
    item.lineCount &&
    item.lineCount > currentThresholdLineLength; // Use dynamic threshold

  // Handle checkbox indeterminate state
  React.useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate =
        hasSelectedDescendants && !allDescendantsSelected;
    }
  }, [hasSelectedDescendants, allDescendantsSelected]);

  // Handle drag start
  const handleDragStart = (e: React.DragEvent) => {
    if (isEmpty) return; // Prevent dragging empty folders

    try {
      // Use the item's ID which is already relative to root
      const relativePath = item.id === '/' ? '' : item.id;

      // Set both the custom MIME type and fallback text
      e.dataTransfer.setData('text/plain', relativePath);
      e.dataTransfer.effectAllowed = 'copy';
      setIsDragging(true);

      console.log('Started drag with path:', relativePath);
    } catch (error) {
      console.error('Error preparing drag data:', error);
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Get the display name - for root level, handle supplementary materials directory specially
  const displayName =
    isRoot && item.path.endsWith(FILE_SYSTEM.materialsDirName)
      ? 'Supplementary Materials'
      : isRoot
        ? getBaseName(item.path)
        : item.name;

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFileSelection(item.id, item.type === 'folder', fileTree);
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
        className={(() => {
          let className = 'file-item-row flex items-center py-1 rounded-sm';
          if (isContextSelected) {
            className += ' bg-blue-100 dark:bg-blue-900/40';
          } else if (isHeuristicSeed) {
            className += ' file-item--heuristic-seed';
          }
          return className;
        })()}
        style={(() => {
          if (isContextSelected || !isNeighboring || !relevanceScore) {
            return {};
          }

          // Apply thresholding: only highlight files with score >= threshold
          if (relevanceScore < CONTEXT_BUILDER.VISUALIZATION_THRESHOLD) {
            return {};
          }

          // Calculate normalized relevance factor (0.0 to 1.0)
          const range =
            CONTEXT_BUILDER.MAX_VISUALIZATION_SCORE -
            CONTEXT_BUILDER.VISUALIZATION_THRESHOLD;
          if (range <= 0) {
            return {}; // Prevent division by zero
          }

          const clampedScore = Math.min(
            relevanceScore,
            CONTEXT_BUILDER.MAX_VISUALIZATION_SCORE
          );
          const relevanceFactor =
            (clampedScore - CONTEXT_BUILDER.VISUALIZATION_THRESHOLD) / range;

          // Apply the non-linear transform: f(x) = 1 - (1-x)^2
          const transformedFactor = 1 - Math.pow(1 - relevanceFactor, 2);

          // Use the same base colors as selection but with scaling opacity
          if (isDarkMode) {
            // Dark mode: match dark:bg-blue-900/40 behavior, which is already semi-transparent.
            const finalAlpha = transformedFactor * 0.4;
            return { backgroundColor: `rgba(30, 58, 138, ${finalAlpha})` };
          } else {
            // Light mode: use blue-100 color with scaling opacity to match bg-blue-100 at max
            const finalAlpha = transformedFactor;
            return { backgroundColor: `rgba(219, 234, 254, ${finalAlpha})` };
          }
        })()}
        onClick={handleFileClick}
        onContextMenu={(e) => onContextMenu(e, item)}
      >
        {/* Checkbox or placeholder - Not draggable */}
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

        {/* Draggable content area */}
        <div
          className={`flex flex-1 items-center ${
            !isEmpty ? DRAG_DROP.classes.draggable : ''
          } ${isDragging ? DRAG_DROP.classes.dragging : ''}`}
          draggable={!isEmpty}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Folder expand/collapse button or file icon */}
          <div className="flex-shrink-0">
            {item.type === 'folder' ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFolder(item.id);
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex-shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown size={16} className="flex-shrink-0" />
                ) : (
                  <ChevronRight size={16} className="flex-shrink-0" />
                )}
              </button>
            ) : level === 0 && item.name === 'External Resources' ? (
              <div className="p-1">
                <Book
                  size={16}
                  className="text-purple-600 dark:text-purple-400"
                />
              </div>
            ) : (
              <div className="p-1">
                <File
                  size={16}
                  className="file-icon text-gray-600 dark:text-gray-400"
                />
              </div>
            )}
          </div>

          {/* Filename */}
          <span
            className={`truncate file-name cursor-pointer
              ${isRoot ? 'font-bold' : ''}
              ${isCurrentlyViewed ? 'font-bold text-blue-600 dark:text-blue-400' : ''}
            `}
          >
            {displayName}
            {item.type === 'folder' ? '/' : ''}
          </span>

          {/* Scissors icon for long files */}
          {isLongFile && (
            <div
              className="ml-2 text-gray-500 dark:text-gray-400"
              title={`File has ${item.lineCount} lines (threshold: ${currentThresholdLineLength})`} // Use dynamic threshold
            >
              <Scissors size={14} />
            </div>
          )}
        </div>
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
