// AI Summary: Displays selected file count with popover for managing, reordering, and removing files.
// Uses drag-and-drop for file reordering and provides clear all functionality.
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, GripVertical, Trash2, Files, Plus } from 'lucide-react';
import { useContextStore } from '../../stores/contextStore';

interface SelectedFilesDisplayProps {
  selectedFiles: string[];
  removeFileFromSelection: (itemId: string) => void;
  clearFileSelection: () => void;
  reorderFileSelection: (sourceIndex: number, destinationIndex: number) => void;
  toggleFileSelection: (itemId: string, isFolder: boolean, fileTree: any[]) => void;
  rootItems: any[];
}

const SelectedFilesDisplay: React.FC<SelectedFilesDisplayProps> = ({
  selectedFiles,
  removeFileFromSelection,
  clearFileSelection,
  reorderFileSelection,
  toggleFileSelection,
  rootItems,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Get context data
  const { heuristicSeedFiles, neighboringFiles } = useContextStore();

  // Create unified list of suggested files
  const suggestedFiles = useMemo(() => {
    const selectedSet = new Set(selectedFiles);
    const combined: Array<{ path: string; score: number; isHeuristic: boolean }> = [];

    // Add heuristic seed files
    heuristicSeedFiles.forEach(file => {
      if (!selectedSet.has(file.path)) {
        combined.push({ ...file, isHeuristic: true });
      }
    });

    // Add neighboring files
    neighboringFiles.forEach((score, path) => {
      if (!selectedSet.has(path)) {
        combined.push({ path, score, isHeuristic: false });
      }
    });

    // Sort by score descending
    return combined.sort((a, b) => b.score - a.score);
  }, [heuristicSeedFiles, neighboringFiles, selectedFiles]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsPopoverOpen(false);
      }
    };

    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isPopoverOpen]);

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    if (
      draggedIndex !== null &&
      dragOverIndex !== null &&
      draggedIndex !== dragOverIndex
    ) {
      reorderFileSelection(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Format file path for display (remove leading slash, show only filename for very long paths)
  const formatFilePath = (filePath: string): string => {
    const cleanPath = filePath.replace(/^\//, '');
    const parts = cleanPath.split('/');

    // With wider popover, allow longer paths before truncating
    if (cleanPath.length > 60) {
      return `.../${parts[parts.length - 1]}`;
    }

    return cleanPath;
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        className="flex items-center justify-center gap-1 w-14 px-2 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors relative"
        title={`${selectedFiles.length} files selected for this task`}
      >
        <Files className="w-4 h-4 flex-shrink-0" />
        <span className="font-medium min-w-[1.5rem] text-center">
          {selectedFiles.length}
        </span>
        {selectedFiles.length > 0 && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
        )}
      </button>

      {/* Popover */}
      {isPopoverOpen && (
        <div
          ref={popoverRef}
          className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-[40rem] max-h-[28rem] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-600">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              Selected Files ({selectedFiles.length})
            </h3>
            {selectedFiles.length > 0 && (
              <button
                onClick={() => {
                  clearFileSelection();
                  setIsPopoverOpen(false);
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                title="Clear all selected files"
              >
                <Trash2 size={12} />
                Clear All
              </button>
            )}
          </div>

          {/* File List */}
          <div className="max-h-80 overflow-y-auto">
            {selectedFiles.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No files selected for this task
              </div>
            ) : (
              <div className="p-2">
                {selectedFiles.map((filePath, index) => (
                  <div
                    key={`${filePath}-${index}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-move group
                      ${draggedIndex === index ? 'opacity-50' : ''}
                      ${dragOverIndex === index && draggedIndex !== index ? 'border-t-2 border-blue-500' : ''}
                    `}
                  >
                    {/* Drag Handle */}
                    <div className="flex-shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                      <GripVertical size={14} />
                    </div>

                    {/* Priority Badge */}
                    <div
                      className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-medium rounded-full flex items-center justify-center"
                      title={`Priority: ${index + 1} (${index === 0 ? 'highest' : index === selectedFiles.length - 1 ? 'lowest' : 'medium'})`}
                    >
                      {index + 1}
                    </div>

                    {/* File Path */}
                    <div
                      className="flex-1 min-w-0 text-sm text-gray-700 dark:text-gray-300"
                      title={filePath.replace(/^\//, '')}
                    >
                      <div className="truncate">{formatFilePath(filePath)}</div>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeFileFromSelection(filePath)}
                      className="flex-shrink-0 p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove from selection"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Potentially Relevant Files Section */}
          {suggestedFiles.length > 0 && (
            <>
              <div className="p-3 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Potentially Relevant Files ({suggestedFiles.length})
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Files identified by Athanor's relevance engine
                </p>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <div className="p-2">
                  {suggestedFiles.map((file, index) => (
                    <div
                      key={`suggested-${file.path}-${index}`}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                    >
                      {/* File Type Indicator */}
                      <div className="flex-shrink-0">
                        {file.isHeuristic ? (
                          <span
                            className="text-yellow-500 dark:text-yellow-400"
                            title="Heuristically identified as relevant"
                          >
                            ✨
                          </span>
                        ) : (
                          <span
                            className="text-blue-500 dark:text-blue-400"
                            title="Neighboring file"
                          >
                            🔗
                          </span>
                        )}
                      </div>

                      {/* Score Badge */}
                      <div
                        className="flex-shrink-0 px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs font-medium rounded"
                        title={`Relevance score: ${file.score}`}
                      >
                        {Math.round(file.score)}
                      </div>

                      {/* File Path */}
                      <div
                        className="flex-1 min-w-0 text-sm text-gray-700 dark:text-gray-300"
                        title={file.path.replace(/^\//, '')}
                      >
                        <div className="truncate">{formatFilePath(file.path)}</div>
                      </div>

                      {/* Promote Button */}
                      <button
                        onClick={() => toggleFileSelection(file.path, false, rootItems)}
                        className="flex-shrink-0 p-1 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Add to selection"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Footer with tip */}
          {selectedFiles.length > 1 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                💡 Drag to reorder priority.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SelectedFilesDisplay;
