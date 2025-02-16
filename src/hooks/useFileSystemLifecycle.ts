// AI Summary: Manages file system initialization, watching, and refresh lifecycle with consolidated tree loading.
// Now imports buildFileTree from fileTreeBuilder.ts and createAthignoreFile from athignoreFileService.ts.
// Maintains overall logic to handle user project setup, ignoring rules, and watchers.

import { useState, useCallback, useEffect, useRef } from 'react';
import { FileItem } from '../utils/fileTree';
import { useFileSystemStore } from '../stores/fileSystemStore';
import { useLogStore } from '../stores/logStore';
import { FILE_SYSTEM } from '../utils/constants';
import { loadPrompts } from '../services/promptService';
import { FileSystemLifecycle } from '../types/global';

// Newly imported modules after refactoring
import { buildFileTree } from '../services/fileTreeBuilder';
import { createAthignoreFile } from '../services/athignoreFileService';

export function useFileSystemLifecycle(): FileSystemLifecycle {
  const [currentDirectory, setCurrentDirectory] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');
  const [filesData, setFilesData] = useState<FileItem | null>(null);
  const [materialsData, setResourcesData] = useState<FileItem | null>(null);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [pendingDirectory, setPendingDirectory] = useState<string | null>(null);
  const [gitignoreExists, setGitignoreExists] = useState(false);

  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  const { validateSelections } = useFileSystemStore();
  const { addLog } = useLogStore();

  const refreshFileSystem = useCallback(
    async (silent = false) => {
      if (isRefreshing || !currentDirectory) return;

      setIsRefreshing(true);
      try {
        await window.fileSystem.reloadIgnoreRules();
        const mainTree = await buildFileTree(currentDirectory);
        const materialsPath = await window.fileSystem.getMaterialsDir();
        const materialsTree = await buildFileTree(materialsPath, '', true);

        validateSelections(mainTree);
        setFilesData(mainTree);
        setResourcesData(materialsTree);

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

  const handleCreateProject = async (useStandardIgnore: boolean, importGitignore: boolean) => {
    if (!pendingDirectory) return;

    try {
      // Create .athignore file with selected rules
      await createAthignoreFile(pendingDirectory, {
        useStandardIgnore,
        importGitignore,
      });

      // Initialize project with new .athignore
      await initializeProject(pendingDirectory);
      addLog('Created new Athanor project');
    } catch (error) {
      console.error('Error creating project:', error);
      addLog('Failed to create project');
      throw error;
    }
  };

  const initializeProject = async (directory: string) => {
    useFileSystemStore.getState().resetState();
    const normalizedDir = await window.fileSystem.normalizeToUnix(directory);
    setCurrentDirectory(normalizedDir);

    const mainTree = await buildFileTree(normalizedDir);
    const materialsPath = await window.fileSystem.getMaterialsDir();
    const materialsTree = await buildFileTree(materialsPath, '', true);

    validateSelections(mainTree);
    setFilesData(mainTree);
    setResourcesData(materialsTree);

    await loadPrompts();
    await setupWatcher(normalizedDir);
    addLog(`Loaded directory: ${normalizedDir}`);

    // Reset dialog state
    setShowProjectDialog(false);
    setPendingDirectory(null);
  };

  const handleOpenFolder = async () => {
    try {
      const selectedDir = await window.fileSystem.openFolder();

      // If user cancelled folder selection, do nothing
      if (!selectedDir) {
        return;
      }

      const normalizedDir = await window.fileSystem.normalizeToUnix(selectedDir);

      // Check if .athignore exists
      const athignoreExists = await window.fileSystem.fileExists('.athignore');
      if (!athignoreExists) {
        // Check for .gitignore
        const hasGitignore = await window.fileSystem.fileExists('.gitignore');
        setGitignoreExists(hasGitignore);

        // Show project creation dialog
        setPendingDirectory(normalizedDir);
        setShowProjectDialog(true);
        return;
      }

      // If .athignore exists, proceed with normal initialization
      await initializeProject(normalizedDir);
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

        const mainTree = await buildFileTree(normalizedDir);
        const materialsPath = await window.fileSystem.getMaterialsDir();
        const materialsTree = await buildFileTree(materialsPath, '', true);

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

  const handleProjectDialogClose = () => {
    setShowProjectDialog(false);
    setPendingDirectory(null);
  };

  return {
    currentDirectory,
    isRefreshing,
    appVersion,
    filesData,
    materialsData,
    handleOpenFolder,
    refreshFileSystem,
    showProjectDialog,
    gitignoreExists,
    pendingDirectory,
    handleCreateProject,
    handleProjectDialogClose,
  };
}
