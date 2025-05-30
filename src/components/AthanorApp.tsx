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
    gitignoreExists,
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
          const shouldUseDarkColors = await window.nativeThemeBridge.getInitialDarkMode();
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
        cleanup = window.nativeThemeBridge.onNativeThemeUpdated((shouldUseDarkColors: boolean) => {
          if (shouldUseDarkColors) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        });
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

  if (!filesData && !showProjectDialog) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl">Loading project structure...</div>
      </div>
    );
  }

  return (
    <>
      <ProjectCreationDialog
        isOpen={showProjectDialog}
        onClose={handleProjectDialogClose}
        onCreateProject={handleCreateProject}
        gitignoreExists={gitignoreExists}
        folderName={pendingDirectory ? getBaseName(pendingDirectory) : ''}
      />
      {filesData && (
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
