// AI Summary: Main file explorer component that coordinates tree rendering and file operations.
// Uses FileExplorerItem for individual items and manages overall explorer state.
import React from 'react';
import { useFileSystemStore } from '../../stores/fileSystemStore';
import { FileItem } from '../../utils/fileTree';
import FileContextMenu from '../FileContextMenu';
import FileExplorerItem from './FileExplorerItem';
import { useFileExplorer } from './hooks/useFileExplorer';

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
  const { validateSelections } = useFileSystemStore();
  const {
    explorerRef,
    expandedFolders,
    contextMenu,
    handleIgnoreItem,
    toggleFolder,
    handleContextMenu,
    handleCloseContextMenu,
  } = useFileExplorer(items, onRefresh);

  return (
    <div
      ref={explorerRef}
      className="select-none relative h-full overflow-y-auto scrollbar-thin"
      onMouseLeave={handleCloseContextMenu}
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
