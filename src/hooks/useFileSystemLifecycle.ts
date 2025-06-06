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
  const [gitignoreExists, setGitignoreExists] = useState(false);

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

  const handleCreateProject = async (
    useStandardIgnore: boolean,
    importGitignore: boolean
  ) => {
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
    const normalizedDir = await window.pathUtils.toUnix(directory);
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

    // Save the successfully loaded project path to application settings
    try {
      const { updateLastOpenedProjectPath } = useSettingsStore.getState();
      await updateLastOpenedProjectPath(normalizedDir);
      addLog(`Saved project path to settings: ${normalizedDir}`);
    } catch (error) {
      console.error('Error saving project path to settings:', error);
      addLog('Warning: Failed to save project path to settings');
    }

    // Reset dialog state
    setShowProjectDialog(false);
    setPendingDirectory(null);
  };

  const handleOpenFolder = async () => {
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
        // Check for .gitignore
        const hasGitignore = await window.fileService.exists('.gitignore');
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
  }, [setupWatcher, validateSelections, addLog, loadApplicationSettings, loadProjectSettings]);

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
  } as FileSystemLifecycle;
}
