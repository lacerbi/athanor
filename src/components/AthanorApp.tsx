// AI Summary: Root application component that coordinates file system lifecycle and layout.
// Manages application state and delegates rendering to MainLayout component.
import React, { useRef, useEffect } from 'react';
import { getBaseName } from '../utils/fileTree';
import MainLayout from './MainLayout';
import ProjectCreationDialog from './ProjectCreationDialog';
import { useFileSystemLifecycle } from '../hooks/useFileSystemLifecycle';
import { useLogStore, LogEntry } from '../stores/logStore';
import { useApplyChangesStore } from '../stores/applyChangesStore';
import { useSettingsStore } from '../stores/settingsStore';
import { TabType } from './AthanorTabs';

const AthanorApp: React.FC = () => {
  // UI State
  const [activeTab, setActiveTab] = React.useState<TabType>('workbench');
  const [lastTabChangeTime, setLastTabChangeTime] = React.useState<number>(0);

  // Refs
  const logsRef = useRef<HTMLDivElement | null>(null);

  // Store Hooks
  const { logs, addLog } = useLogStore() as {
    logs: LogEntry[];
    addLog: (message: string | Omit<LogEntry, 'id' | 'timestamp'>) => void;
  };
  const { setChangeAppliedCallback } = useApplyChangesStore();
  const { applicationSettings, loadApplicationSettings } = useSettingsStore();

  // File System Lifecycle
  const {
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
  } = useFileSystemLifecycle();

  // Auto-scroll logs panel
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  // Load application settings on mount
  useEffect(() => {
    loadApplicationSettings();
  }, [loadApplicationSettings]);

  // Theme switching logic
  useEffect(() => {
    const applyTheme = async () => {
      const uiTheme = applicationSettings?.uiTheme || 'Auto';

      if (uiTheme === 'Light') {
        document.documentElement.classList.remove('dark');
      } else if (uiTheme === 'Dark') {
        document.documentElement.classList.add('dark');
      } else if (uiTheme === 'Auto') {
        try {
          // Get initial system theme
          const shouldUseDarkColors =
            await window.nativeThemeBridge.getInitialDarkMode();
          if (shouldUseDarkColors) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        } catch (error) {
          console.error('Failed to get initial dark mode preference:', error);
          // Fallback to light mode
          document.documentElement.classList.remove('dark');
        }
      }
    };

    applyTheme();
  }, [applicationSettings?.uiTheme]);

  // Listen for system theme changes when in Auto mode
  useEffect(() => {
    const uiTheme = applicationSettings?.uiTheme || 'Auto';

    if (uiTheme === 'Auto') {
      let cleanup: (() => void) | undefined;

      try {
        cleanup = window.nativeThemeBridge.onNativeThemeUpdated(
          (shouldUseDarkColors: boolean) => {
            if (shouldUseDarkColors) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
        );
      } catch (error) {
        console.error('Failed to listen for native theme updates:', error);
      }

      return () => {
        if (cleanup) {
          cleanup();
        }
      };
    }
  }, [applicationSettings?.uiTheme]);

  // Register refresh callback
  useEffect(() => {
    setChangeAppliedCallback((newlyCreatedPath?: string) =>
      newlyCreatedPath
        ? refreshFileSystem(newlyCreatedPath)
        : refreshFileSystem(true)
    );
    return () => setChangeAppliedCallback(null);
  }, [refreshFileSystem, setChangeAppliedCallback]);

  // Handle tab changes
  const handleTabChange = (newTab: TabType) => {
    setActiveTab(newTab);
    setLastTabChangeTime(Date.now());
  };

  // Handle tab change side effects
  useEffect(() => {
    if (activeTab !== 'workbench' && lastTabChangeTime > 0) {
      const timeSinceLastChange = Date.now() - lastTabChangeTime;
      if (timeSinceLastChange < 100) {
        refreshFileSystem(true);
      }
    }
  }, [activeTab, lastTabChangeTime, refreshFileSystem]);

  // Show welcome screen when no project is loaded
  if (!currentDirectory && !showProjectDialog) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center p-8 max-w-md">
          <div className="text-6xl mb-6">📁</div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Welcome to Athanor ⚗️
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Get started by opening a project folder. Athanor will help you work
            with AI assistants to understand and modify your project files or
            codebase.
          </p>
          <button
            onClick={handleOpenFolder}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            Open Project Folder
          </button>
        </div>
      </div>
    );
  }

  // Show loading state only when we have a directory but no files data yet
  if (currentDirectory && !filesData && !showProjectDialog) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-xl text-gray-900 dark:text-gray-100">
          Loading project structure...
        </div>
      </div>
    );
  }

  return (
    <>
      <ProjectCreationDialog
        isOpen={showProjectDialog}
        onClose={handleProjectDialogClose}
        onCreateProject={handleCreateProject}
        folderName={pendingDirectory ? getBaseName(pendingDirectory) : ''}
      />
      {filesData && currentDirectory && (
        <MainLayout
          filesData={filesData}
          materialsData={materialsData}
          currentDirectory={currentDirectory}
          appVersion={appVersion}
          isRefreshing={isRefreshing}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onOpenFolder={handleOpenFolder}
          onRefresh={refreshFileSystem}
          logsRef={logsRef}
          logs={logs}
        />
      )}
    </>
  );
};

export default AthanorApp;
