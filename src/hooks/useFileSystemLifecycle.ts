// AI Summary: Manages file system initialization, watching, and refresh lifecycle with consolidated tree loading.
// Provides hooks for directory operations, file system refresh, and watcher setup using shared tree loading logic.
import { useState, useCallback, useEffect, useRef } from 'react';
import { FileItem } from '../utils/fileTree';
import { buildFileTree } from '../services/fileSystemService';
import { createAthignoreFile } from '../services/fileIgnoreService';
import { useFileSystemStore } from '../stores/fileSystemStore';
import { useLogStore } from '../stores/logStore';
import { useSettingsStore } from '../stores/settingsStore';
import { loadPrompts, loadTasks } from '../services/promptService';
import { readAthanorConfig } from '../utils/configUtils';
import { SETTINGS } from '../utils/constants';
import type { ApplicationSettings } from '../types/global';

import { FileSystemLifecycle } from '../types/global';

// Shared helper for loading both main and materials trees
const loadAndSetTrees = async (basePath: string) => {
  const mainTree = await buildFileTree(basePath);
  const materialsPath = await window.fileService.getMaterialsDir();
  const materialsTree = await buildFileTree(materialsPath, '', true);
  useFileSystemStore.getState().setFileTree([mainTree, materialsTree]);
  return { mainTree, materialsTree };
};

// Helper for loading effective configuration with settings integration
const loadAndSetEffectiveConfig = async (basePath: string) => {
  try {
    // Get current project settings from the settings store
    const { projectSettings } = useSettingsStore.getState();
    
    // Load effective configuration with settings integration
    const effectiveConfig = await readAthanorConfig(basePath, projectSettings);
    
    // Update the file system store with the effective config
    useFileSystemStore.getState().setEffectiveConfig(effectiveConfig);
    
    return effectiveConfig;
  } catch (error) {
    console.error('Error loading effective configuration:', error);
    useFileSystemStore.getState().setEffectiveConfig(null);
    return null;
  }
};

export function useFileSystemLifecycle(): FileSystemLifecycle {
  const [currentDirectory, setCurrentDirectory] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');
  const [filesData, setFilesData] = useState<FileItem | null>(null);
  const [materialsData, setResourcesData] = useState<FileItem | null>(null);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [pendingDirectory, setPendingDirectory] = useState<string | null>(null);

  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  const { validateSelections, clearSelections } = useFileSystemStore();
  const { addLog } = useLogStore();
  const { loadProjectSettings, loadApplicationSettings, projectSettings } = useSettingsStore();

  const refreshFileSystem = useCallback(
    async (silentOrNewPath: boolean | string = false, newlyCreatedPath?: string) => {
      // Handle both function signatures:
      // refreshFileSystem(silent = false) and 
      // refreshFileSystem(newlyCreatedPath?: string)
      let silent = false;
      
      if (typeof silentOrNewPath === 'boolean') {
        silent = silentOrNewPath;
      } else if (typeof silentOrNewPath === 'string') {
        newlyCreatedPath = silentOrNewPath;
        silent = true;
      }
      if (isRefreshing || !currentDirectory) return;

      setIsRefreshing(true);
      try {
        await window.fileService.reloadIgnoreRules();
        const { mainTree, materialsTree } =
          await loadAndSetTrees(currentDirectory);
        validateSelections(mainTree);
        setFilesData(mainTree);
        setResourcesData(materialsTree);

        // Load effective configuration with settings
        await loadAndSetEffectiveConfig(currentDirectory);

        // Load prompts and tasks
        await Promise.all([
          loadPrompts(),
          loadTasks()
        ]);

        // Auto-select newly created file if path was provided
        if (newlyCreatedPath) {
          const { selectItems } = useFileSystemStore.getState();
          selectItems([newlyCreatedPath]);
          addLog(`Auto-selected newly created file: ${newlyCreatedPath}`);
        }
        
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

  const setupWatcher = useCallback(
    async (dir: string) => {
      try {
        await window.fileService.watch(dir, async () => {
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

  const initializeProject = useCallback(async (directory: string) => {
    const normalizedDir = await window.pathUtils.toUnix(directory);
    
    // Set the base directory in the main process FIRST. This is the fix for startup hang.
    await window.fileService.setBaseDirectory(normalizedDir);
    
    useFileSystemStore.getState().resetState();
    setCurrentDirectory(normalizedDir);

    const { mainTree, materialsTree } = await loadAndSetTrees(normalizedDir);
    validateSelections(mainTree);
    setFilesData(mainTree);
    setResourcesData(materialsTree);

    // Load project settings for the new directory
    await loadProjectSettings(normalizedDir);
    
    // Load effective configuration with settings
    await loadAndSetEffectiveConfig(normalizedDir);

    // Load prompts and tasks
    await Promise.all([
      loadPrompts(),
      loadTasks()
    ]);
    
    await setupWatcher(normalizedDir);
    addLog(`Loaded directory: ${normalizedDir}`);

    // Save the successfully loaded project path and update recent projects list
    try {
      // Get the save action and current settings from the Zustand store
      const { saveApplicationSettings, applicationSettings } = useSettingsStore.getState();
      const currentSettings = applicationSettings || { ...SETTINGS.defaults.application };
      const newPath = normalizedDir;

      const existingPaths = currentSettings.recentProjectPaths || [];
      const filteredPaths = existingPaths.filter(p => p !== newPath);
      const newRecentPaths = [newPath, ...filteredPaths];

      // Enforce limit on recent projects
      if (newRecentPaths.length > SETTINGS.limits.MAX_RECENT_PROJECTS) {
        newRecentPaths.length = SETTINGS.limits.MAX_RECENT_PROJECTS;
      }

      const newSettings: ApplicationSettings = {
        ...currentSettings,
        lastOpenedProjectPath: newPath,
        recentProjectPaths: newRecentPaths,
      };
      
      // Use the store action to save settings, which updates both state and disk
      await saveApplicationSettings(newSettings);
      
      window.electron.send('app:rebuild-menu', undefined); // Notify main process
      addLog('Updated recent projects list.');
    } catch (error) {
      console.error('Error updating recent projects list:', error);
      addLog('Warning: Failed to update recent projects list.');
    }

    // Reset dialog state
    setShowProjectDialog(false);
    setPendingDirectory(null);
  }, [addLog, setupWatcher, validateSelections, loadProjectSettings]);

  const handleCreateProject = useCallback(async (useStandardIgnore: boolean) => {
    if (!pendingDirectory) return;

    try {
      // Create .athignore file with selected rules
      await createAthignoreFile(pendingDirectory, {
        useStandardIgnore,
      });

      // Initialize project with new .athignore
      await initializeProject(pendingDirectory);

      addLog('Created new Athanor project');
    } catch (error) {
      console.error('Error creating project:', error);
      addLog('Failed to create project');
      throw error;
    }
  }, [pendingDirectory, initializeProject, addLog]);

  const handleOpenFolder = useCallback(async () => {
    try {
      const selectedDir = await window.fileService.openFolder();

      // If user cancelled folder selection, do nothing
      if (!selectedDir) {
        return;
      }

      const normalizedDir = await window.pathUtils.toUnix(selectedDir);

      // Check if .athignore exists
      const athignoreExists = await window.fileService.exists('.athignore');
      if (!athignoreExists) {
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
  }, [initializeProject]);

  useEffect(() => {
    const initializeFileSystem = async () => {
      if (isInitializedRef.current) return;
      isInitializedRef.current = true;

      try {
        // Load application settings first (independent of project)
        await loadApplicationSettings();
        
        // Get initial project path from main process
        const initialPath = await window.app.getInitialPath();
        
        if (initialPath) {
          // If we have a valid initial path, initialize the project
          await initializeProject(initialPath);
        } else {
          // No project state - set empty state
          setCurrentDirectory('');
          setFilesData(null);
          setResourcesData(null);
          useFileSystemStore.getState().resetState();
          
          // Still load prompts and tasks for when a project is opened
          await Promise.all([
            loadPrompts(),
            loadTasks()
          ]);
          
          addLog('No project loaded - ready to open a folder');
        }
      } catch (error) {
        console.error('Error initializing file system:', error);
        addLog('Failed to initialize file system');
        
        // On error, set to no project state
        setCurrentDirectory('');
        setFilesData(null);
        setResourcesData(null);
        useFileSystemStore.getState().resetState();
      }
    };

    initializeFileSystem();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [setupWatcher, validateSelections, addLog, loadApplicationSettings, loadProjectSettings, initializeProject]);

  // Effect to update effective config when project settings change
  useEffect(() => {
    if (currentDirectory && projectSettings !== undefined) {
      // Reload effective configuration when project settings change
      loadAndSetEffectiveConfig(currentDirectory).catch(error => {
        console.error('Error updating effective configuration after settings change:', error);
        addLog('Failed to update configuration after settings change');
      });
    }
  }, [projectSettings, currentDirectory, addLog]);

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

  // Set up listeners for menu commands from main process
  useEffect(() => {
    const cleanupOpenFolder = window.electron.receive('menu:open-folder', () => handleOpenFolder());
    const cleanupOpenPath = window.electron.receive('menu:open-path', (path: string) => initializeProject(path));

    // Return a cleanup function that will be called when the component unmounts
    return () => {
      cleanupOpenFolder();
      cleanupOpenPath();
    };
  }, [handleOpenFolder, initializeProject]);

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
    pendingDirectory,
    handleCreateProject,
    handleProjectDialogClose,
  } as FileSystemLifecycle;
}
