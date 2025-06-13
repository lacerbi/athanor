// AI Summary: Displays and manages file changes from AI output with diff visualization.
// Provides GitHub-style diff highlighting with accept/reject controls.
// Handles warnings for large files and tracks change approval state.
import React, { useState, useEffect, useRef } from 'react';
import { createPatch } from 'diff';
import { AlertTriangle } from 'lucide-react';
import { useApplyChangesStore } from '../stores/applyChangesStore';
import { useFileSystemStore } from '../stores/fileSystemStore';
import { useWorkbenchStore } from '../stores/workbenchStore';
import { useSettingsStore } from '../stores/settingsStore';
import { getSmartPreview } from '../utils/codebaseDocumentation';
import { SETTINGS } from '../utils/constants';

interface DiffLineProps {
  content: string;
  type: 'add' | 'remove' | 'context' | 'header';
}

const DiffLine: React.FC<DiffLineProps> = ({ content, type }) => {
  const baseClass = 'font-mono text-xs leading-5 whitespace-pre';
  let lineClass = baseClass;
  let prefix = ' ';

  switch (type) {
    case 'add':
      lineClass +=
        ' bg-green-100 dark:bg-blue-900/30 text-green-900 dark:text-blue-100';
      prefix = '+';
      break;
    case 'remove':
      lineClass +=
        ' bg-red-100 dark:bg-orange-900/30 text-red-900 dark:text-orange-100';
      prefix = '-';
      break;
    case 'header':
      lineClass +=
        ' bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 font-semibold';
      prefix = '@';
      break;
    default:
      lineClass += ' text-gray-700 dark:text-gray-300';
      prefix = ' ';
  }

  return (
    <div className={lineClass}>
      <span className="select-none w-4 inline-block">{prefix}</span>
      {content}
    </div>
  );
};

const DiffView: React.FC<{
  oldText: string;
  newText: string;
  filePath: string;
  onDiffBlocksCalculated?: (blocks: number[]) => void;
  diffViewRef?: React.RefObject<HTMLDivElement>;
}> = ({ oldText, newText, filePath, onDiffBlocksCalculated, diffViewRef }) => {
  // Only normalize line endings for comparison
  const normalizeForComparison = (text: string) => {
    if (!text) return '';
    return text
      .replace(/\r\n/g, '\n') // Normalize Windows line endings
      .replace(/\r/g, '\n'); // Normalize old Mac line endings
  };

  const normalizedOld = normalizeForComparison(oldText);
  const normalizedNew = normalizeForComparison(newText);

  if (normalizedOld === normalizedNew) {
    return (
      <div className="p-4 text-gray-500 dark:text-gray-400 italic">
        No changes (files are identical after normalizing line endings)
      </div>
    );
  }

  // Create diff with context
  const patch = createPatch(filePath, normalizedOld, normalizedNew, '', '', {
    context: 999999,
  });

  const lines = patch.split('\n').slice(2); // Skip the diff header

  // Calculate diff blocks (consecutive sequences of +/- lines)
  useEffect(() => {
    const diffBlocks: number[] = [];
    let inDiffBlock = false;
    let blockStartIndex = -1;

    lines.forEach((line, index) => {
      const isDiffLine = line.startsWith('+') || line.startsWith('-');

      if (isDiffLine && !inDiffBlock) {
        // Start of a new diff block
        inDiffBlock = true;
        blockStartIndex = index;
        diffBlocks.push(index);
      } else if (!isDiffLine && inDiffBlock) {
        // End of diff block
        inDiffBlock = false;
      }
    });

    if (onDiffBlocksCalculated) {
      onDiffBlocksCalculated(diffBlocks);
    }
  }, [lines, onDiffBlocksCalculated]);

  const renderDiffLine = (line: string, index: number) => {
    if (!line && index === lines.length - 1) return null;

    if (line.startsWith('@@')) {
      return <DiffLine key={index} content={line} type="header" />;
    } else if (line.startsWith('+')) {
      return <DiffLine key={index} content={line.slice(1)} type="add" />;
    } else if (line.startsWith('-')) {
      return <DiffLine key={index} content={line.slice(1)} type="remove" />;
    } else {
      return <DiffLine key={index} content={line.slice(1)} type="context" />;
    }
  };

  return (
    <div
      ref={diffViewRef}
      className="overflow-x-auto bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 p-2 min-w-0"
    >
      <div className="space-y-0 min-w-max">
        {lines.map((line, index) => (
          <div key={index} data-line-index={index}>
            {renderDiffLine(line, index)}
          </div>
        ))}
      </div>
    </div>
  );
};

interface FileOperationItemProps {
  operation: any;
  index: number;
  onAccept: (idx: number) => void;
  onReject: (idx: number) => void;
  isActive?: boolean;
  onDiffBlocksCalculated?: (blocks: number[]) => void;
  diffViewRef?: React.RefObject<HTMLDivElement>;
}

const FileOperationItem = React.forwardRef<
  HTMLDivElement,
  FileOperationItemProps
>(
  (
    {
      operation: op,
      index,
      onAccept,
      onReject,
      isActive = false,
      onDiffBlocksCalculated,
      diffViewRef,
    },
    ref
  ) => {
    const [showWarning, setShowWarning] = useState(false);
    const { tabs, activeTabIndex } = useWorkbenchStore();
    const { applicationSettings } = useSettingsStore();

    useEffect(() => {
      const checkWarning = async () => {
        try {
          // If the file is being created, no warning needed
          if (
            !op.file_path ||
            op.file_path.trim() === '' ||
            op.file_operation === 'CREATE'
          ) {
            setShowWarning(false);
            return;
          }

          // Check if the file is selected in the active tab
          const activeTab = tabs[activeTabIndex];
          const selectedFiles = activeTab?.selectedFiles || [];
          const isSelected = selectedFiles.some((itemId) =>
            itemId.endsWith(op.file_path)
          );
          if (isSelected) {
            setShowWarning(false);
            return;
          }

          // Check file content - if preview is truncated, it means it's too long
          const content = await window.fileSystem.readFile(op.file_path, {
            encoding: 'utf8',
          });
          if (typeof content !== 'string') {
            setShowWarning(false);
            return;
          }

          // Get smart preview configuration from settings with fallback to defaults
          const config = {
            minLines:
              applicationSettings?.minSmartPreviewLines ??
              SETTINGS.defaults.application.minSmartPreviewLines,
            maxLines:
              applicationSettings?.maxSmartPreviewLines ??
              SETTINGS.defaults.application.maxSmartPreviewLines,
          };

          const preview = getSmartPreview(content, config);
          setShowWarning(preview.endsWith('... (content truncated)'));
        } catch (error) {
          console.error('Error checking file status:', error);
          setShowWarning(false);
        }
      };

      void checkWarning();
    }, [
      op.file_path,
      op.file_operation,
      tabs,
      activeTabIndex,
      applicationSettings,
    ]);

    return (
      <div
        ref={ref}
        className={`border rounded p-4 bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-900/20 flex flex-col transition-all ${
          isActive
            ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500 dark:ring-blue-400'
            : 'border-gray-200 dark:border-gray-600'
        }`}
      >
        <div className="flex justify-between items-start mb-4 flex-shrink-0">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-start gap-2">
              <p className="font-semibold break-all text-gray-900 dark:text-gray-100">
                {op.file_path}
              </p>
              {showWarning && (
                <div
                  className="text-amber-500 dark:text-amber-400 flex-shrink-0"
                  title="This file is not currently in focus (checkbox marked). The AI might not have had access to its full content."
                >
                  <AlertTriangle className="w-4 h-4" />
                </div>
              )}
            </div>
            {op.file_message && (
              <p className="text-sm text-gray-500 dark:text-gray-400 break-words">
                {op.file_message}
              </p>
            )}
          </div>
          <div className="text-right shrink-0 ml-4">
            <span
              className={`inline-block px-2 py-1 rounded text-xs font-semibold text-white ${
                op.file_operation === 'CREATE'
                  ? 'bg-green-600'
                  : op.file_operation === 'DELETE'
                    ? 'bg-red-600'
                    : 'bg-blue-600'
              }`}
            >
              {op.file_operation}
            </span>
          </div>
        </div>

        <div className="min-w-0 w-full">
          <DiffView
            oldText={op.old_code}
            newText={op.new_code}
            filePath={op.file_path}
            onDiffBlocksCalculated={onDiffBlocksCalculated}
            diffViewRef={diffViewRef}
          />
        </div>

        <div className="mt-4 flex justify-between items-center flex-shrink-0">
          <div className="flex gap-2">
            <button
              className="px-3 py-1 bg-green-500 dark:bg-green-600 text-white rounded hover:bg-green-600 dark:hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
              disabled={op.accepted || op.rejected}
              onClick={() => onAccept(index)}
            >
              Accept
            </button>
            <button
              className="px-3 py-1 bg-red-500 dark:bg-red-600 text-white rounded hover:bg-red-600 dark:hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
              disabled={op.accepted || op.rejected}
              onClick={() => onReject(index)}
            >
              Reject
            </button>
          </div>

          {(op.accepted || op.rejected) && (
            <span
              className={`text-sm font-medium ${
                op.accepted
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {op.accepted ? 'Changes Accepted' : 'Changes Rejected'}
            </span>
          )}
        </div>
      </div>
    );
  }
);

FileOperationItem.displayName = 'FileOperationItem';

const ApplyChangesPanel: React.FC = () => {
  const { activeOperations, applyChange, rejectChange } =
    useApplyChangesStore();
  const { fileTree } = useFileSystemStore();
  const [currentIdx, setCurrentIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [currentDiffBlocks, setCurrentDiffBlocks] = useState<number[]>([]);
  const diffViewRefs = useRef<React.RefObject<HTMLDivElement>[]>([]);
  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  const isManualNavigationRef = useRef(false);
  const manualNavigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hasProject = fileTree.length > 0;

  // Navigation handlers
  const NAVIGATION_PADDING_ABOVE = 16; // Space above the target element when navigating

  const goTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goPrev = () => {
    const targetIdx = Math.max(0, currentIdx - 1);
    if (targetIdx === currentIdx) return; // Already at the beginning
    
    if (targetIdx >= 0 && targetIdx < itemRefs.current.length) {
      const element = itemRefs.current[targetIdx];
      if (element && containerRef.current && stickyHeaderRef.current) {
        // Disable scroll-based updates during manual navigation
        isManualNavigationRef.current = true;
        
        // Clear any existing timeout
        if (manualNavigationTimeoutRef.current) {
          clearTimeout(manualNavigationTimeoutRef.current);
        }
        
        // Get the sticky header height
        const headerHeight = stickyHeaderRef.current.offsetHeight;
        
        // Calculate the target scroll position
        // We want the top of the element to be NAVIGATION_PADDING_ABOVE pixels below the sticky header
        const elementTop = element.offsetTop;
        const targetScrollTop = elementTop - headerHeight - NAVIGATION_PADDING_ABOVE;
        const currentScrollTop = containerRef.current.scrollTop;

        // Update the current index immediately
        setCurrentIdx(targetIdx);

        // Check if we actually need to scroll
        if (Math.abs(targetScrollTop - currentScrollTop) < 2) {
          // Already at the target position, just re-enable scroll updates
          isManualNavigationRef.current = false;
          return;
        }

        // Set up scroll end detection
        let scrollEndTimer: NodeJS.Timeout | null = null;
        let hasScrolled = false;
        
        const onScroll = () => {
          hasScrolled = true;
          if (scrollEndTimer) clearTimeout(scrollEndTimer);
          scrollEndTimer = setTimeout(() => {
            // Re-enable scroll-based updates after scrolling stops
            isManualNavigationRef.current = false;
            containerRef.current?.removeEventListener('scroll', onScroll);
            if (scrollEndTimer) clearTimeout(scrollEndTimer);
          }, 150); // 150ms after last scroll event
        };
        
        // Add scroll listener before scrolling
        containerRef.current.addEventListener('scroll', onScroll, { passive: true });
        
        // Force the scroll to happen
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.scrollTo({
              top: Math.max(0, targetScrollTop),
              behavior: 'smooth',
            });
          }
        });
        
        // Backup timeout in case scroll event detection fails
        manualNavigationTimeoutRef.current = setTimeout(() => {
          isManualNavigationRef.current = false;
          containerRef.current?.removeEventListener('scroll', onScroll);
          if (!hasScrolled && containerRef.current) {
            // Force scroll if it didn't happen
            containerRef.current.scrollTop = Math.max(0, targetScrollTop);
          }
        }, 1000); // 1 second backup timeout
      }
    }
  };

  const goNext = () => {
    const targetIdx = Math.min(activeOperations.length - 1, currentIdx + 1);
    if (targetIdx === currentIdx) return; // Already at the end
    
    if (targetIdx >= 0 && targetIdx < itemRefs.current.length) {
      const element = itemRefs.current[targetIdx];
      if (element && containerRef.current && stickyHeaderRef.current) {
        // Disable scroll-based updates during manual navigation
        isManualNavigationRef.current = true;
        
        // Clear any existing timeout
        if (manualNavigationTimeoutRef.current) {
          clearTimeout(manualNavigationTimeoutRef.current);
        }
        
        // Get the sticky header height
        const headerHeight = stickyHeaderRef.current.offsetHeight;
        
        // Calculate the target scroll position
        // We want the top of the element to be NAVIGATION_PADDING_ABOVE pixels below the sticky header
        const elementTop = element.offsetTop;
        const targetScrollTop = elementTop - headerHeight - NAVIGATION_PADDING_ABOVE;
        const currentScrollTop = containerRef.current.scrollTop;

        // Update the current index immediately
        setCurrentIdx(targetIdx);

        // Check if we actually need to scroll
        if (Math.abs(targetScrollTop - currentScrollTop) < 2) {
          // Already at the target position, just re-enable scroll updates
          isManualNavigationRef.current = false;
          return;
        }

        // Set up scroll end detection
        let scrollEndTimer: NodeJS.Timeout | null = null;
        let hasScrolled = false;
        
        const onScroll = () => {
          hasScrolled = true;
          if (scrollEndTimer) clearTimeout(scrollEndTimer);
          scrollEndTimer = setTimeout(() => {
            // Re-enable scroll-based updates after scrolling stops
            isManualNavigationRef.current = false;
            containerRef.current?.removeEventListener('scroll', onScroll);
            if (scrollEndTimer) clearTimeout(scrollEndTimer);
          }, 150); // 150ms after last scroll event
        };
        
        // Add scroll listener before scrolling
        containerRef.current.addEventListener('scroll', onScroll, { passive: true });
        
        // Force the scroll to happen
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.scrollTo({
              top: Math.max(0, targetScrollTop),
              behavior: 'smooth',
            });
          }
        });
        
        // Backup timeout in case scroll event detection fails
        manualNavigationTimeoutRef.current = setTimeout(() => {
          isManualNavigationRef.current = false;
          containerRef.current?.removeEventListener('scroll', onScroll);
          if (!hasScrolled && containerRef.current) {
            // Force scroll if it didn't happen
            containerRef.current.scrollTop = Math.max(0, targetScrollTop);
          }
        }, 1000); // 1 second backup timeout
      }
    }
  };

  const goEnd = () => {
    // Scroll to the bottom of the current item
    if (currentIdx >= 0 && currentIdx < itemRefs.current.length) {
      const element = itemRefs.current[currentIdx];
      if (element && containerRef.current) {
        const elementBottom =
          element.offsetTop +
          element.offsetHeight -
          containerRef.current.clientHeight +
          100; // 100px padding
        containerRef.current.scrollTo({
          top: elementBottom,
          behavior: 'smooth',
        });
      }
    }
  };

  const goBottom = () => {
    // Scroll to the very bottom of the entire list
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  const goPrevDiff = () => {
    if (currentIdx < 0 || currentIdx >= diffViewRefs.current.length) return;

    const diffViewRef = diffViewRefs.current[currentIdx];
    const diffView = diffViewRef?.current;
    if (!diffView || currentDiffBlocks.length === 0) return;

    // Get current scroll position within the diff view
    const diffViewRect = diffView.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    // Find visible line elements
    const lineElements = diffView.querySelectorAll('[data-line-index]');
    let currentLineIndex = -1;

    // Find the topmost visible line
    for (let i = 0; i < lineElements.length; i++) {
      const lineRect = lineElements[i].getBoundingClientRect();
      if (lineRect.top >= containerRect.top) {
        currentLineIndex = parseInt(
          lineElements[i].getAttribute('data-line-index') || '-1'
        );
        break;
      }
    }

    // Find previous diff block
    let targetBlock = -1;
    for (let i = currentDiffBlocks.length - 1; i >= 0; i--) {
      if (currentDiffBlocks[i] < currentLineIndex) {
        targetBlock = currentDiffBlocks[i];
        break;
      }
    }

    // If no previous block, go to last block (wrap around)
    if (targetBlock === -1 && currentDiffBlocks.length > 0) {
      targetBlock = currentDiffBlocks[currentDiffBlocks.length - 1];
    }

    // Scroll to target block
    if (targetBlock !== -1) {
      const targetElement = diffView.querySelector(
        `[data-line-index="${targetBlock}"]`
      );
      if (targetElement && containerRef.current) {
        const targetRect = targetElement.getBoundingClientRect();
        const scrollTop =
          containerRef.current.scrollTop +
          targetRect.top -
          containerRect.top -
          50;
        containerRef.current.scrollTo({
          top: scrollTop,
          behavior: 'smooth',
        });
      }
    }
  };

  const goNextDiff = () => {
    if (currentIdx < 0 || currentIdx >= diffViewRefs.current.length) return;

    const diffViewRef = diffViewRefs.current[currentIdx];
    const diffView = diffViewRef?.current;
    if (!diffView || currentDiffBlocks.length === 0) return;

    // Get current scroll position within the diff view
    const diffViewRect = diffView.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    // Find visible line elements
    const lineElements = diffView.querySelectorAll('[data-line-index]');
    let currentLineIndex = -1;

    // Find the topmost visible line
    for (let i = 0; i < lineElements.length; i++) {
      const lineRect = lineElements[i].getBoundingClientRect();
      if (lineRect.top >= containerRect.top) {
        currentLineIndex = parseInt(
          lineElements[i].getAttribute('data-line-index') || '-1'
        );
        break;
      }
    }

    // Find next diff block
    let targetBlock = -1;
    for (let i = 0; i < currentDiffBlocks.length; i++) {
      if (currentDiffBlocks[i] > currentLineIndex) {
        targetBlock = currentDiffBlocks[i];
        break;
      }
    }

    // If no next block, go to first block (wrap around)
    if (targetBlock === -1 && currentDiffBlocks.length > 0) {
      targetBlock = currentDiffBlocks[0];
    }

    // Scroll to target block
    if (targetBlock !== -1) {
      const targetElement = diffView.querySelector(
        `[data-line-index="${targetBlock}"]`
      );
      if (targetElement && containerRef.current) {
        const targetRect = targetElement.getBoundingClientRect();
        const scrollTop =
          containerRef.current.scrollTop +
          targetRect.top -
          containerRect.top -
          50;
        containerRef.current.scrollTo({
          top: scrollTop,
          behavior: 'smooth',
        });
      }
    }
  };

  // Reset refs array when operations change
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, activeOperations.length);
    // Create refs for diff views
    diffViewRefs.current = Array(activeOperations.length)
      .fill(null)
      .map(
        (_, i) => diffViewRefs.current[i] || React.createRef<HTMLDivElement>()
      );
  }, [activeOperations.length]);

  // Handle operations list changes - clamp currentIdx to valid range
  useEffect(() => {
    if (activeOperations.length === 0) {
      setCurrentIdx(0);
    } else if (currentIdx >= activeOperations.length) {
      setCurrentIdx(activeOperations.length - 1);
    }
  }, [activeOperations.length, currentIdx]);

  // Update diff blocks when current index changes
  useEffect(() => {
    // Reset diff blocks when switching files
    setCurrentDiffBlocks([]);
  }, [currentIdx]);

  // Handle scroll to update current index based on the item at the top of the viewport
  useEffect(() => {
    const handleScroll = () => {
      if (
        !containerRef.current ||
        !stickyHeaderRef.current ||
        itemRefs.current.length === 0
      ) {
        return;
      }

      // The focal point should be where items appear after navigation
      // This is NAVIGATION_PADDING_ABOVE pixels below the bottom of the sticky header
      const headerRect = stickyHeaderRef.current.getBoundingClientRect();
      const headerBottom = headerRect.bottom;
      const focalPointY = headerBottom + NAVIGATION_PADDING_ABOVE;

      let newCurrentIdx = -1;

      // Find the last item whose top is at or above the focal point
      for (let i = 0; i < itemRefs.current.length; i++) {
        const itemRef = itemRefs.current[i];
        if (!itemRef) continue;

        const itemRect = itemRef.getBoundingClientRect();
        // Check if the top of the item has scrolled past the focal point
        if (itemRect.top <= focalPointY) {
          newCurrentIdx = i;
        } else {
          // Since items are ordered, we can stop once we find one below the focal point
          break;
        }
      }

      // If no item's top has passed the focal point (e.g. at the very top of the list),
      // default to the first item.
      if (newCurrentIdx === -1 && itemRefs.current.length > 0) {
        newCurrentIdx = 0;
      }

      // Only update if we're not in manual navigation mode
      if (!isManualNavigationRef.current && newCurrentIdx !== -1 && newCurrentIdx !== currentIdx) {
        setCurrentIdx(newCurrentIdx);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      // Initial check
      handleScroll();
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [currentIdx, activeOperations.length]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (manualNavigationTimeoutRef.current) {
        clearTimeout(manualNavigationTimeoutRef.current);
      }
    };
  }, []);

  if (!hasProject) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚡</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Apply AI Changes
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            When you get code suggestions from AI assistants, paste them into
            the workbench. Athanor will parse the changes and show them here for
            review before applying to your files.
          </p>
          <button
            onClick={() => window.fileService.openFolder()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            Open Project Folder
          </button>
        </div>
      </div>
    );
  }

  if (!activeOperations.length) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No active operations to display.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full overflow-y-auto">
      {activeOperations.length > 0 && (
        <div ref={stickyHeaderRef} className="sticky top-0 z-10 flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={goTop}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded transition-colors"
          >
            Top
          </button>
          <button
            onClick={goPrev}
            disabled={currentIdx <= 0 || activeOperations.length <= 1}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100 dark:disabled:hover:bg-gray-700"
          >
            Previous
          </button>
          <button
            onClick={goNext}
            disabled={
              currentIdx >= activeOperations.length - 1 ||
              activeOperations.length <= 1
            }
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100 dark:disabled:hover:bg-gray-700"
          >
            Next
          </button>
          <button
            onClick={goEnd}
            disabled={activeOperations.length === 0}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100 dark:disabled:hover:bg-gray-700"
          >
            End
          </button>
          <button
            onClick={goBottom}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded transition-colors"
          >
            Bottom
          </button>
          <div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-2" />
          <button
            onClick={goPrevDiff}
            disabled={currentDiffBlocks.length === 0}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100 dark:disabled:hover:bg-gray-700"
          >
            Prev Diff
          </button>
          <button
            onClick={goNextDiff}
            disabled={currentDiffBlocks.length === 0}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100 dark:disabled:hover:bg-gray-700"
          >
            Next Diff
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
            {activeOperations.length > 0 ? currentIdx + 1 : 0} /{' '}
            {activeOperations.length}
          </span>
        </div>
      )}
      <div className="p-4 space-y-4">
        <div className="bg-amber-100 dark:bg-amber-900/30 border-l-4 border-amber-500 dark:border-amber-400 p-4 text-amber-700 dark:text-amber-200">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 011 1v3a1 1 0 11-2 0V6a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            <strong>Warning:</strong>&nbsp;Applying changes will modify files
            and may break the code. Ensure you have a backup via Git or other
            means.
          </div>
        </div>
        <div className="space-y-6">
          {activeOperations.map((op, idx) => (
            <FileOperationItem
              key={`${op.file_path}-${idx}`}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              operation={op}
              index={idx}
              onAccept={applyChange}
              onReject={rejectChange}
              isActive={idx === currentIdx}
              onDiffBlocksCalculated={(blocks) => {
                if (idx === currentIdx) {
                  setCurrentDiffBlocks(blocks);
                }
              }}
              diffViewRef={diffViewRefs.current[idx]}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ApplyChangesPanel;
