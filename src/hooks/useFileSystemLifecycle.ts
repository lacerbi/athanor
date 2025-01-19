// AI Summary: Manages file system initialization, watching, and refresh lifecycle.
// Provides hooks for directory operations, file system refresh, and watcher setup.
// Integrates with FileSystemStore and LogStore for state management.
import { useState, useCallback, useEffect, useRef } from 'react';
import { FileItem } from '../utils/fileTree';
import { buildFileTree } from '../services/fileSystemService';
import { useFileSystemStore } from '../stores/fileSystemStore';
import { useLogStore } from '../stores/logStore';
import { FILE_SYSTEM } from '../utils/constants';
import { loadPrompts } from '../services/promptService';

export interface FileSystemLifecycle {
  currentDirectory: string;
  isRefreshing: boolean;
  appVersion: string;
  filesData: FileItem | null;
  resourcesData: FileItem | null;
  handleOpenFolder: () => Promise<void>;
  refreshFileSystem: (silent?: boolean) => Promise<void>;
}

export function useFileSystemLifecycle(): FileSystemLifecycle {
  const [currentDirectory, setCurrentDirectory] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');
  const [filesData, setFilesData] = useState<FileItem | null>(null);
  const [resourcesData, setResourcesData] = useState<FileItem | null>(null);
  
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  
  const { validateSelections, clearSelections } = useFileSystemStore();
  const { addLog } = useLogStore();

  // Core file system refresh function
  const refreshFileSystem = useCallback(
    async (silent = false) => {
      if (isRefreshing || !currentDirectory) return;

      setIsRefreshing(true);
      try {
        await window.fileSystem.reloadIgnoreRules();
        // Build main project tree
        const fileTree = await buildFileTree(currentDirectory);
        // Build resources tree
        const resourcesPath = `${currentDirectory}/${FILE_SYSTEM.resourcesDirName}`;
        const resourcesTree = await buildFileTree(resourcesPath, '', true);

        useFileSystemStore.getState().setFileTree([fileTree, resourcesTree]);
        validateSelections(fileTree);
        setFilesData(fileTree);
        setResourcesData(resourcesTree);
        
        // Load prompts after file system refresh
        await loadPrompts();
        
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

  const handleOpenFolder = async () => {
    try {
      const selectedDir = await window.fileSystem.openFolder();
      if (selectedDir) {
        clearSelections();
        // Ensure we have normalized path
        const normalizedDir = await window.fileSystem.normalizeToUnix(selectedDir);
        setCurrentDirectory(normalizedDir);
        const fileTree = await buildFileTree(normalizedDir);
        useFileSystemStore.getState().setFileTree([fileTree]);
        validateSelections(fileTree);
        setFilesData(fileTree);
        
        // Load prompts after opening new directory
        await loadPrompts();
        
        await setupWatcher(normalizedDir);
        addLog(`Loaded directory: ${normalizedDir}`);
      }
    } catch (error) {
      console.error('Error opening folder:', error);
      addLog('Failed to open folder');
    }
  };

  // Initial file system load
  useEffect(() => {
    const initializeFileSystem = async () => {
      if (isInitializedRef.current) return;
      isInitializedRef.current = true;

      try {
        const currentDir = await window.fileSystem.getCurrentDirectory();
        const normalizedDir = await window.fileSystem.normalizeToUnix(currentDir);
        setCurrentDirectory(normalizedDir);
        const fileTree = await buildFileTree(normalizedDir);
        const resourcesPath = await window.fileSystem.joinPaths(normalizedDir, FILE_SYSTEM.resourcesDirName);
        const resourcesTree = await buildFileTree(resourcesPath, '', true);

        useFileSystemStore.getState().setFileTree([fileTree, resourcesTree]);
        validateSelections(fileTree);
        setFilesData(fileTree);
        setResourcesData(resourcesTree);
        
        // Load prompts during initial file system setup
        await loadPrompts();
        
        await setupWatcher(normalizedDir);
        addLog(`Loaded directory: ${normalizedDir}`);
      } catch (error) {
        console.error('Error initializing file system:', error);
        addLog('Failed to initialize file system');
      }
    };

    initializeFileSystem();
    
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [setupWatcher, validateSelections, addLog]);

  // Fetch app version
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const version = await window.app.getVersion();
        setAppVersion(`v${version}`);
      } catch (error) {
        console.error('Error fetching app version:', error);
        setAppVersion('');
        addLog('Failed to fetch app version');
      }
    };
    fetchVersion();
  }, [addLog]);

  return {
    currentDirectory,
    isRefreshing,
    appVersion,
    filesData,
    resourcesData,
    handleOpenFolder,
    refreshFileSystem,
  };
}
