// AI Summary: Enhanced settings panel with form inputs for both project and application settings.
// Features debounced saving, validation, error handling, and example application settings.

import React, { useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useFileSystemStore } from '../stores/fileSystemStore';
import { SETTINGS } from '../utils/constants';
import ProjectSettingsPane from './ProjectSettingsPane';
import ApplicationSettingsPane from './ApplicationSettingsPane';
import ApiKeyManagementPane from './ApiKeyManagementPane';

const SettingsPanel: React.FC = () => {
  const {
    projectSettings,
    isLoadingProjectSettings,
    projectSettingsError,
    currentProjectPath,
    applicationSettings,
    isLoadingApplicationSettings,
    applicationSettingsError,
    loadApplicationSettings,
    saveProjectSettings,
    saveApplicationSettings,
    resetErrors,
  } = useSettingsStore();

  const { fileTree } = useFileSystemStore();

  // Load application settings on mount
  useEffect(() => {
    loadApplicationSettings();
  }, [loadApplicationSettings]);

  // Clear errors when component mounts
  useEffect(() => {
    resetErrors();
  }, [resetErrors]);

  const hasProject = fileTree.length > 0 && !!currentProjectPath;

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
          {/* Project Settings Section */}
          <ProjectSettingsPane
            projectSettings={projectSettings}
            isLoadingProjectSettings={isLoadingProjectSettings}
            projectSettingsError={projectSettingsError}
            currentProjectPath={currentProjectPath}
            saveProjectSettings={saveProjectSettings}
            hasProject={hasProject}
            selectProjectInfoFile={window.fileService.selectProjectInfoFile}
          />

          {/* Application Settings Section */}
          <ApplicationSettingsPane
            applicationSettings={applicationSettings}
            isLoadingApplicationSettings={isLoadingApplicationSettings}
            applicationSettingsError={applicationSettingsError}
            saveApplicationSettings={saveApplicationSettings}
            applicationDefaults={SETTINGS.defaults.application}
          />

          {/* API Key Management Section */}
          <ApiKeyManagementPane />
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
