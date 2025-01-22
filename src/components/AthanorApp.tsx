// AI Summary: Root application component that coordinates file system lifecycle and layout.
// Manages application state and delegates rendering to MainLayout component.
import React, { useRef, useEffect, useState } from 'react';
import MainLayout from './MainLayout';
import { useFileSystemLifecycle } from '../hooks/useFileSystemLifecycle';
import { useLogStore, LogEntry } from '../stores/logStore';
import { useApplyChangesStore } from '../stores/applyChangesStore';
import { TabType } from './AthanorTabs';

const AthanorApp: React.FC = () => {
  // UI State
  const [activeTab, setActiveTab] = useState<TabType>('workbench');
  const [lastTabChangeTime, setLastTabChangeTime] = useState<number>(0);

  // Refs
  const logsRef = useRef<HTMLDivElement | null>(null);

  // Store Hooks
  const { logs, addLog } = useLogStore() as { logs: LogEntry[]; addLog: (message: string | Omit<LogEntry, 'id' | 'timestamp'>) => void };
  const { setChangeAppliedCallback } = useApplyChangesStore();

  // File System Lifecycle
  const {
    currentDirectory,
    isRefreshing,
    appVersion,
    filesData,
    materialsData,
    handleOpenFolder,
    refreshFileSystem,
  } = useFileSystemLifecycle();

  // Auto-scroll logs panel
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  // Register refresh callback
  useEffect(() => {
    setChangeAppliedCallback(() => refreshFileSystem(true));
    return () => setChangeAppliedCallback(null);
  }, [refreshFileSystem, setChangeAppliedCallback]);

  // Add test clickable log
  useEffect(() => {
    addLog({
      message: "Click me to test log interaction!",
      onClick: () => {
        addLog("Test log entry was clicked!");
      }
    });
  }, []); // Run once on mount

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

  if (!filesData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl">Loading project structure...</div>
      </div>
    );
  }

  return (
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
  );
};

export default AthanorApp;
