// AI Summary: Context menu for file/folder operations, featuring "Expand all" and "Collapse all" at the top for directories. Also includes ignore actions and closes automatically on selection.

import React, { useEffect, useState } from 'react';
import { useLogStore } from '../stores/logStore';

interface FileContextMenuProps {
  type: 'file' | 'folder';
  name: string; // Display name
  path: string; // Absolute path
  x: number;
  y: number;
  onClose: () => void;
  onIgnoreItem: (itemPath: string, ignoreAll: boolean) => void;
  onExpandRecursively: () => void;
  onCollapseRecursively: () => void;
}

const FileContextMenu: React.FC<FileContextMenuProps> = ({
  type,
  name,
  path: itemPath,
  x,
  y,
  onClose,
  onIgnoreItem,
  onExpandRecursively,
  onCollapseRecursively,
}) => {
  const [position, setPosition] = useState({ x, y });
  const { addLog } = useLogStore();

  useEffect(() => {
    // Get window dimensions
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Get menu dimensions once it's rendered
    const menu = document.querySelector('.context-menu') as HTMLElement;
    if (!menu) return;

    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;

    // Calculate the best position to ensure menu stays within viewport
    const adjustedX = Math.min(x, windowWidth - menuWidth);
    const adjustedY = Math.min(y, windowHeight - menuHeight);

    setPosition({
      x: adjustedX,
      y: adjustedY,
    });
  }, [x, y]);

  // Retrieve the project-relative path from main process
  const getProjectRelativePath = async (): Promise<string> => {
    try {
      let relativePath = await window.pathUtils.relative(itemPath);
      if (type === 'folder' && !relativePath.endsWith('/')) {
        relativePath += '/';
      }
      return relativePath;
    } catch (error) {
      console.error('Error getting project relative path:', error);
      // Fallback if there's an error
      return name + (type === 'folder' ? '/' : '');
    }
  };

  // Handle clicking outside the menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.context-menu')) {
        onClose();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  const handleIgnoreThis = async () => {
    const relativePath = await getProjectRelativePath();
    const logPath = relativePath.endsWith('/')
      ? relativePath.slice(0, -1)
      : relativePath;
    addLog(`Adding ${type} '${logPath}' to .athignore`);
    // Single-file/folder ignore => ignoreAll = false
    onIgnoreItem(relativePath, false);
  };

  const handleIgnoreAll = () => {
    // Remove any leading slash from the name
    const baseName = name.replace(/^\/+/, '');
    // For ignoring all folders with this name, we pass the bare name plus slash if folder
    const ignorePath = type === 'folder' ? baseName + '/' : baseName;
    const logPath = ignorePath.endsWith('/')
      ? ignorePath.slice(0, -1)
      : ignorePath;
    addLog(`Adding all ${type}s named '${logPath}' to .athignore`);
    // Wildcard pattern => ignoreAll = true
    onIgnoreItem(ignorePath, true);
  };

  return (
    <div
      className="context-menu fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[200px]"
      style={{
        left: position.x,
        top: position.y,
        maxWidth: '300px',
      }}
    >
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 font-medium text-sm text-gray-600 dark:text-gray-300">
        {name}
      </div>
      {type === 'folder' && (
        <div className="py-1">
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none dark:text-gray-200"
            onClick={() => {
              onExpandRecursively();
              onClose();
            }}
          >
            Expand all
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none dark:text-gray-200"
            onClick={() => {
              onCollapseRecursively();
              onClose();
            }}
          >
            Collapse all
          </button>
        </div>
      )}
      {type === 'folder' && (
        <div className="border-t border-gray-100 dark:border-gray-700" />
      )}
      <div className="py-1">
        <button
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none dark:text-gray-200"
          onClick={handleIgnoreThis}
        >
          Ignore this {type}
        </button>
        <button
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none dark:text-gray-200"
          onClick={handleIgnoreAll}
        >
          Ignore all {type}s with this name
        </button>
      </div>
    </div>
  );
};

export default FileContextMenu;
