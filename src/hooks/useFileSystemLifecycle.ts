// AI Summary: Manages file system initialization, watching, and refresh lifecycle with consolidated tree loading.
// Provides hooks for directory operations, file system refresh, and watcher setup using shared tree loading logic.
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
  materialsData: FileItem | null;
  handleOpenFolder: () => Promise<void>;
  refreshFileSystem: (silent?: boolean) => Promise<void>;
}

// Shared helper for loading both main and materials trees
const loadAndSetTrees = async (basePath: string) => {
  const mainTree = await buildFileTree(basePath);
  const materialsPath = `${basePath}/${FILE_SYSTEM.materialsDirName}`;
  const materialsTree = await buildFileTree(materialsPath, '', true);
  useFileSystemStore.getState().setFileTree([mainTree, materialsTree]);
  return { mainTree, materialsTree };
};

export function useFileSystemLifecycle(): FileSystemLifecycle {
  const [currentDirectory, setCurrentDirectory] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');
  const [filesData, setFilesData] = useState<FileItem | null>(null);
  const [materialsData, setResourcesData] = useState<FileItem | null>(null);

  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  const { validateSelections, clearSelections } = useFileSystemStore();
  const { addLog } = useLogStore();

  const refreshFileSystem = useCallback(
    async (silent = false) => {
      if (isRefreshing || !currentDirectory) return;

      setIsRefreshing(true);
      try {
        await window.fileSystem.reloadIgnoreRules();
        const { mainTree } = await loadAndSetTrees(currentDirectory);
        validateSelections(mainTree);
        setFilesData(mainTree);

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

  const handleOpenFolder = async () => {
    try {
      const selectedDir = await window.fileSystem.openFolder();
      if (selectedDir) {
        // Reset all file system state before loading new folder
        useFileSystemStore.getState().resetState();
        const normalizedDir = await window.fileSystem.normalizeToUnix(selectedDir);
        setCurrentDirectory(normalizedDir);
        
        const { mainTree } = await loadAndSetTrees(normalizedDir);
        validateSelections(mainTree);
        setFilesData(mainTree);

        await loadPrompts();
        await setupWatcher(normalizedDir);
        addLog(`Loaded directory: ${normalizedDir}`);
      }
    } catch (error) {
      console.error('Error opening folder:', error);
      addLog('Failed to open folder');
    }
  };

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

  useEffect(() => {
    const initializeFileSystem = async () => {
      if (isInitializedRef.current) return;
      isInitializedRef.current = true;

      try {
        const currentDir = await window.fileSystem.getCurrentDirectory();
        const normalizedDir = await window.fileSystem.normalizeToUnix(currentDir);
        setCurrentDirectory(normalizedDir);
        
        const { mainTree, materialsTree } = await loadAndSetTrees(normalizedDir);
        validateSelections(mainTree);
        setFilesData(mainTree);
        setResourcesData(materialsTree);

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
    materialsData,
    handleOpenFolder,
    refreshFileSystem,
  };
}
