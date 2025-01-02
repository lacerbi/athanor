// AI Summary: Main application component that integrates file explorer, action panel, and change management.
// Manages file system operations, tab navigation, and real-time updates.
// Coordinates between file explorer, prompt generation, and change application workflows.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw, FolderOpen, File, FileText } from 'lucide-react';
import FileExplorer from './FileExplorer';
import ActionPanel from './ActionPanel';
import FileViewerPanel from './FileViewerPanel';
import ApplyChangesPanel from './ApplyChangesPanel';
import CommandButton from './CommandButton';
import { FileItem } from '../utils/fileTree';
import { buildFileTree } from '../services/fileSystemService';
import { useFileSystemStore } from '../stores/fileSystemStore';
import { useLogStore } from '../stores/logStore';
import { useApplyChangesStore } from '../stores/applyChangesStore';

type TabType = 'workbench' | 'viewer' | 'apply-changes';

const AthanorApp: React.FC = () => {
  // UI State
  const [leftPanelWidth, setLeftPanelWidth] = useState(384);
  const [isResizing, setIsResizing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('workbench');
  const [lastTabChangeTime, setLastTabChangeTime] = useState<number>(0);

  // File System State
  const [filesData, setFilesData] = useState<FileItem | null>(null);
  const [currentDirectory, setCurrentDirectory] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refs
  const resizeRef = useRef<HTMLDivElement | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logsRef = useRef<HTMLDivElement | null>(null);
  const isInitializedRef = useRef(false);

  // Store Hooks
  const {
    validateSelections,
    clearSelections,
    selectedFileCount,
    selectedLinesTotal,
  } = useFileSystemStore();
  const { logs, addLog } = useLogStore();
  const { setChangeAppliedCallback, setOperations, clearOperations } =
    useApplyChangesStore();

  // Auto-scroll logs panel
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  // Core file system refresh function
  const refreshFileSystem = useCallback(
    async (silent = false) => {
      if (isRefreshing || !currentDirectory) return;

      setIsRefreshing(true);
      try {
        await window.fileSystem.reloadIgnoreRules();
        const fileTree = await buildFileTree(currentDirectory);
        useFileSystemStore.getState().setFileTree([fileTree]);
        validateSelections(fileTree);
        setFilesData(fileTree);
        if (!silent) {
          addLog('File system refreshed');
        }
      } catch (error) {
        console.error('Error refreshing file system:', error);
        addLog('Failed to refresh file system');
      }
      setIsRefreshing(false);
    },
    [currentDirectory, isRefreshing, validateSelections, addLog]
  );

  // Set up file system watcher
  const setupWatcher = useCallback(
    async (dir: string) => {
      try {
        await window.fileSystem.watchDirectory(dir, async () => {
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
          }
          refreshTimeoutRef.current = setTimeout(() => {
            refreshFileSystem(true);
          }, 300);
        });
      } catch (error) {
        console.error('Error setting up watcher:', error);
        addLog('Failed to set up file system watcher');
      }
    },
    [refreshFileSystem, addLog]
  );

  // Initial file system load and setup
  const initializeFileSystem = useCallback(
    async (dir: string) => {
      if (isInitializedRef.current) return;
      isInitializedRef.current = true;

      try {
        setCurrentDirectory(dir);
        const fileTree = await buildFileTree(dir);
        useFileSystemStore.getState().setFileTree([fileTree]);
        validateSelections(fileTree);
        setFilesData(fileTree);
        await setupWatcher(dir);
        addLog(`Loaded directory: ${dir}`);
      } catch (error) {
        console.error('Error initializing file system:', error);
        addLog('Failed to initialize file system');
      }
    },
    [setupWatcher, validateSelections, addLog]
  );

  // Handle opening a new folder
  const handleOpenFolder = async () => {
    try {
      const selectedDir = await window.fileSystem.openFolder();
      if (selectedDir) {
        clearSelections();
        setCurrentDirectory(selectedDir);
        const fileTree = await buildFileTree(selectedDir);
        useFileSystemStore.getState().setFileTree([fileTree]);
        validateSelections(fileTree);
        setFilesData(fileTree);
        await setupWatcher(selectedDir);
        addLog(`Loaded directory: ${selectedDir}`);
      }
    } catch (error) {
      console.error('Error opening folder:', error);
      addLog('Failed to open folder');
    }
  };

  // Register refresh callback
  useEffect(() => {
    setChangeAppliedCallback(() => refreshFileSystem(true));
    return () => setChangeAppliedCallback(null);
  }, [refreshFileSystem, setChangeAppliedCallback]);

  // Handle tab changes
  const handleTabChange = useCallback((newTab: TabType) => {
    setActiveTab(newTab);
    setLastTabChangeTime(Date.now());
  }, []);

  // Handle tab changes
  useEffect(() => {
    // Only refresh file system when switching to file viewer or apply changes
    // to ensure we have the latest file state
    if (activeTab !== 'workbench' && lastTabChangeTime > 0) {
      const timeSinceLastChange = Date.now() - lastTabChangeTime;
      if (timeSinceLastChange < 100) {
        refreshFileSystem(true);
      }
    }
  }, [activeTab, lastTabChangeTime, refreshFileSystem]);

  // Initial file system load
  useEffect(() => {
    const loadInitialDirectory = async () => {
      try {
        const currentDir = await window.fileSystem.getCurrentDirectory();
        await initializeFileSystem(currentDir);
      } catch (error) {
        console.error('Error loading initial directory:', error);
        addLog('Failed to load initial directory');
      }
    };

    loadInitialDirectory();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [initializeFileSystem, addLog]);

  // Handle resizing
  const startResize = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleResize = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = Math.max(150, Math.min(600, e.clientX));
        setLeftPanelWidth(newWidth);
      }
    };

    const stopResize = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', stopResize);
    }

    return () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResize);
    };
  }, [isResizing]);

  const handleFileView = useCallback(() => {
    handleTabChange('viewer');
  }, [handleTabChange]);

  if (!filesData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl">Loading project structure...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white ">
      {/* Left Panel - File Explorer */}
      <div
        style={{ width: leftPanelWidth }}
        className="flex-shrink-0 flex flex-col border-r h-full"
      >
        {/* Fixed top section */}
        <div className="p-4 flex-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenFolder}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                title="Open folder"
              >
                <FolderOpen size={20} className="text-gray-600" />
              </button>
              <button
                onClick={() => refreshFileSystem()}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                disabled={isRefreshing}
                title="Refresh file system"
              >
                <RefreshCw
                  size={20}
                  className={`${
                    isRefreshing
                      ? 'animate-spin text-gray-400'
                      : 'text-gray-600'
                  }`}
                />
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-600 mb-0">{currentDirectory}</div>
        </div>

        {/* Scrollable file explorer section */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4">
          <FileExplorer
            items={[filesData]}
            onViewFile={handleFileView}
            onRefresh={refreshFileSystem}
          />
        </div>

        {/* Fixed bottom section */}
        <div className="border-t p-2 bg-gray-50 text-sm text-gray-600 flex items-center gap-4 flex-none">
          <div
            className="flex items-center gap-1"
            title="Number of selected files"
          >
            <File size={14} />
            <span>{selectedFileCount}</span>
          </div>
          <div
            className="flex items-center gap-1"
            title="Total lines across selected files"
          >
            <FileText size={14} />
            <span>{selectedLinesTotal}</span>
          </div>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        ref={resizeRef}
        className="w-1 cursor-col-resize bg-gray-200 hover:bg-blue-500 active:bg-blue-700"
        onMouseDown={startResize}
      />

      {/* Right Panel */}
      <div className="flex-1 flex flex-col">
        {/* Top panel: tabs */}
        <div className="flex-shrink-0 border-b p-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              className={`px-4 py-2 rounded ${
                activeTab === 'workbench'
                  ? 'bg-gray-200 font-medium'
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => handleTabChange('workbench')}
            >
              Prompt Studio
            </button>
            <button
              className={`px-4 py-2 rounded ${
                activeTab === 'viewer'
                  ? 'bg-gray-200 font-medium'
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => handleTabChange('viewer')}
            >
              File Viewer
            </button>
            <button
              className={`px-4 py-2 rounded ${
                activeTab === 'apply-changes'
                  ? 'bg-gray-200 font-medium'
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => handleTabChange('apply-changes')}
            >
              Apply Changes
            </button>
          </div>
          <CommandButton
            addLog={addLog}
            setOperations={setOperations}
            clearOperations={clearOperations}
            setActiveTab={handleTabChange}
          />
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'workbench' && (
            <ActionPanel
              rootItems={[filesData]}
              setActiveTab={handleTabChange}
              isActive={activeTab === 'workbench'}
            />
          )}
          {activeTab === 'viewer' && <FileViewerPanel />}
          {activeTab === 'apply-changes' && <ApplyChangesPanel />}
        </div>

        {/* Bottom panel: logs */}
        <div
          ref={logsRef}
          className="h-24 border-t p-2 bg-gray-50 overflow-y-auto font-mono text-sm"
        >
          {logs.map((log, index) => (
            <div key={index} className="text-gray-700">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AthanorApp;
