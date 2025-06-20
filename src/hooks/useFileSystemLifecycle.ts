// AI Summary: Manages file system initialization, watching, and refresh lifecycle with consolidated tree loading.
// Provides hooks for directory operations, file system refresh, and watcher setup using shared tree loading logic.
import { useState, useCallback, useEffect, useRef } from 'react';
import { FileItem } from '../utils/fileTree';
import { buildFileTree } from '../services/fileSystemService';
import { createAthignoreFile } from '../services/fileIgnoreService';
import { useFileSystemStore } from '../stores/fileSystemStore';
import { useWorkbenchStore } from '../stores/workbenchStore';
import { useLogStore } from '../stores/logStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useContextStore } from '../stores/contextStore';
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
  const currentDirectoryRef = useRef<string>('');
  const watcherUnsubscribeRef = useRef<() => void>(() => {});

  const { addLog } = useLogStore();
  const { clearFileSelection } = useWorkbenchStore();
  const { loadProjectSettings, loadApplicationSettings, projectSettings } =
    useSettingsStore();
  const { setIsGraphAnalysisInProgress } = useFileSystemStore();
  const { fetchContext, clearContext } = useContextStore();

  // Track previous project settings to detect changes
  const prevProjectSettingsRef = useRef<typeof projectSettings>(undefined);

  const refreshFileSystem = useCallback(
    async (
      silentOrNewPath: boolean | string = false,
      newlyCreatedPath?: string
    ) => {
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
      
      const dir = currentDirectoryRef.current;
      if (isRefreshing || !dir) return;

      setIsRefreshing(true);
      try {
        await window.fileService.reloadIgnoreRules();
        const { mainTree, materialsTree } =
          await loadAndSetTrees(dir);
        setFilesData(mainTree);
        setResourcesData(materialsTree);

        // Load effective configuration with settings
        await loadAndSetEffectiveConfig(dir);

        // Load prompts and tasks
        await Promise.all([loadPrompts(), loadTasks()]);

        // Auto-select newly created file if path was provided
        if (newlyCreatedPath) {
          const { toggleFileSelection } = useWorkbenchStore.getState();
          const { fileTree } = useFileSystemStore.getState();
          toggleFileSelection(newlyCreatedPath, false, fileTree); // false = not a folder
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
    [isRefreshing, addLog]
  );

  const setupWatcher = useCallback(
    async (dir: string) => {
      try {
        // Clean up any existing watcher
        watcherUnsubscribeRef.current();

        const unsubscribe = await window.fileService.watch(dir, async () => {
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
          }
          refreshTimeoutRef.current = setTimeout(() => {
            refreshFileSystem(true);
          }, 300);
        });

        watcherUnsubscribeRef.current = unsubscribe;
      } catch (error) {
        console.error('Error setting up watcher:', error);
        addLog('Failed to set up file system watcher');
      }
    },
    [refreshFileSystem, addLog]
  );

  const initializeProject = useCallback(
    async (directory: string) => {
      const normalizedDir = await window.pathUtils.toUnix(directory);

      useFileSystemStore.getState().resetState();
      clearContext();
      setCurrentDirectory(normalizedDir);
      currentDirectoryRef.current = normalizedDir;

      const { mainTree, materialsTree } = await loadAndSetTrees(normalizedDir);
      // Clear selections for active tab when initializing new project
      clearFileSelection();
      setFilesData(mainTree);
      setResourcesData(materialsTree);

      // Load project settings for the new directory
      await loadProjectSettings(normalizedDir);

      // Load effective configuration with settings
      await loadAndSetEffectiveConfig(normalizedDir);

      // Load prompts and tasks
      await Promise.all([loadPrompts(), loadTasks()]);

      await setupWatcher(normalizedDir);
      addLog(`Loaded directory: ${normalizedDir}`);

      // Save the successfully loaded project path and update recent projects list
      try {
        // Get the save action and current settings from the Zustand store
        const { saveApplicationSettings, applicationSettings } =
          useSettingsStore.getState();
        const currentSettings = applicationSettings || {
          ...SETTINGS.defaults.application,
        };
        const newPath = normalizedDir;

        const existingPaths = currentSettings.recentProjectPaths || [];
        const filteredPaths = existingPaths.filter((p) => p !== newPath);
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
    },
    [addLog, setupWatcher, loadProjectSettings, clearFileSelection, clearContext]
  );

  // Centralized function to process a directory - handles both UI and CLI flows
  const processDirectory = useCallback(
    async (directory: string | null) => {
      if (!directory || directory === currentDirectory) {
        return;
      }

      const normalizedDir = await window.pathUtils.toUnix(directory);

      // Set the base directory in the main process FIRST for relative path checks to work
      await window.fileService.setBaseDirectory(normalizedDir);

      // Check if .athignore exists to determine if this is an existing project
      const athignoreExists = await window.fileService.exists('.athignore');
      
      if (athignoreExists) {
        // Existing project - proceed with loading
        await initializeProject(normalizedDir);
      } else {
        // New project - show creation dialog
        setPendingDirectory(normalizedDir);
        setShowProjectDialog(true);
      }
    },
    [initializeProject, addLog, currentDirectory]
  );

  const handleCreateProject = useCallback(
    async (useStandardIgnore: boolean) => {
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
    },
    [pendingDirectory, initializeProject, addLog]
  );

  const handleOpenFolder = useCallback(async () => {
    try {
      const selectedDir = await window.fileService.openFolder();
      await processDirectory(selectedDir);
    } catch (error) {
      console.error('Error opening folder:', error);
      addLog('Failed to open folder');
    }
  }, [processDirectory, addLog]);

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
          // If we have a valid initial path, process it (checks for .athignore)
          await processDirectory(initialPath);
        } else {
          // No project state - set empty state
          setCurrentDirectory('');
          currentDirectoryRef.current = '';
          setFilesData(null);
          setResourcesData(null);
          useFileSystemStore.getState().resetState();

          // Still load prompts and tasks for when a project is opened
          await Promise.all([loadPrompts(), loadTasks()]);

          addLog('No project loaded - ready to open a folder');
        }
      } catch (error) {
        console.error('Error initializing file system:', error);
        addLog('Failed to initialize file system');

        // On error, set to no project state
        setCurrentDirectory('');
        currentDirectoryRef.current = '';
        setFilesData(null);
        setResourcesData(null);
        useFileSystemStore.getState().resetState();
      }
    };

    initializeFileSystem();

    return () => {
      watcherUnsubscribeRef.current();
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [
    setupWatcher,
    addLog,
    loadApplicationSettings,
    loadProjectSettings,
    processDirectory,
  ]);

  // Effect to update effective config when project settings change
  useEffect(() => {
    const prevSettings = prevProjectSettingsRef.current;

    if (currentDirectory && projectSettings !== undefined) {
      // Check if useGitignore setting has changed
      const useGitignoreChanged =
        prevSettings !== undefined &&
        prevSettings?.useGitignore !== projectSettings?.useGitignore;

      // Reload effective configuration when project settings change
      loadAndSetEffectiveConfig(currentDirectory).catch((error) => {
        console.error(
          'Error updating effective configuration after settings change:',
          error
        );
        addLog('Failed to update configuration after settings change');
      });

      // If useGitignore setting changed, trigger a silent file system refresh
      if (useGitignoreChanged) {
        addLog(
          `Gitignore usage changed to: ${projectSettings?.useGitignore ? 'enabled' : 'disabled'}`
        );
        refreshFileSystem(true).catch((error) => {
          console.error(
            'Error refreshing file system after gitignore setting change:',
            error
          );
          addLog(
            'Failed to refresh file system after gitignore setting change'
          );
        });
      }
    }

    // Update the ref for next comparison
    prevProjectSettingsRef.current = projectSettings;
  }, [projectSettings, currentDirectory, addLog, refreshFileSystem]);

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
    const cleanupOpenFolder = window.electron.receive('menu:open-folder', () =>
      handleOpenFolder()
    );
    const cleanupOpenPath = window.electron.receive(
      'menu:open-path',
      (path: string) => processDirectory(path)
    );
    const cleanupGraphStarted = window.electron.receive(
      'graph-analysis:started',
      () => {
        addLog('Starting project graph analysis...');
        setIsGraphAnalysisInProgress(true);
      }
    );
    const cleanupGraphFinished = window.electron.receive(
      'graph-analysis:finished',
      () => {
        addLog('Project graph analysis finished.');
        setIsGraphAnalysisInProgress(false);
        
        // Trigger initial context calculation to populate neighboring files
        console.log('Graph analysis finished, triggering initial context calculation.');
        fetchContext([], '').catch(err => {
          console.error('Initial context calculation failed:', err);
          addLog('Could not retrieve initial neighboring files.');
        });
      }
    );

    // Return a cleanup function that will be called when the component unmounts
    return () => {
      cleanupOpenFolder();
      cleanupOpenPath();
      cleanupGraphStarted();
      cleanupGraphFinished();
    };
  }, [handleOpenFolder, processDirectory, addLog, setIsGraphAnalysisInProgress]);

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
