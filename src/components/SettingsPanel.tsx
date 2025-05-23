// AI Summary: Enhanced settings panel with form inputs for both project and application settings.
// Features debounced saving, validation, error handling, and example application settings.

import React, { useEffect, useState, useCallback } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useFileSystemStore } from '../stores/fileSystemStore';

// Debounce utility function
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

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
  
  // Local state for project settings form inputs
  const [projectNameOverride, setProjectNameOverride] = useState('');
  const [projectInfoFilePath, setProjectInfoFilePath] = useState('');
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [projectSaveError, setProjectSaveError] = useState<string | null>(null);

  // Local state for application settings form inputs
  const [enableExperimentalFeatures, setEnableExperimentalFeatures] = useState(false);
  const [defaultSmartPreviewLines, setDefaultSmartPreviewLines] = useState('15');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [isSavingApplication, setIsSavingApplication] = useState(false);
  const [applicationSaveError, setApplicationSaveError] = useState<string | null>(null);

  // Debounced values for API calls
  const debouncedProjectName = useDebounce(projectNameOverride, 500);
  const debouncedInfoFilePath = useDebounce(projectInfoFilePath, 500);
  const debouncedSmartPreviewLines = useDebounce(defaultSmartPreviewLines, 500);
  
  // Load application settings on mount
  useEffect(() => {
    loadApplicationSettings();
  }, [loadApplicationSettings]);

  // Clear errors when component mounts
  useEffect(() => {
    resetErrors();
  }, [resetErrors]);

  // Update local state when projectSettings changes
  useEffect(() => {
    if (projectSettings) {
      setProjectNameOverride(projectSettings.projectNameOverride || '');
      setProjectInfoFilePath(projectSettings.projectInfoFilePath || '');
    } else {
      // Clear form when no project settings
      setProjectNameOverride('');
      setProjectInfoFilePath('');
    }
    // Clear any previous save errors when settings load
    setProjectSaveError(null);
  }, [projectSettings]);

  // Update local state when applicationSettings changes
  useEffect(() => {
    if (applicationSettings) {
      setEnableExperimentalFeatures(applicationSettings.enableExperimentalFeatures || false);
      setDefaultSmartPreviewLines(String(applicationSettings.defaultSmartPreviewLines || 15));
      setAutoSaveEnabled(applicationSettings.autoSaveEnabled !== false); // Default to true
    } else {
      // Set default values when no application settings
      setEnableExperimentalFeatures(false);
      setDefaultSmartPreviewLines('15');
      setAutoSaveEnabled(true);
    }
    // Clear any previous save errors when settings load
    setApplicationSaveError(null);
  }, [applicationSettings]);

  // Save project settings when debounced values change
  const saveProjectSettingsCallback = useCallback(async (newSettings: { projectNameOverride?: string; projectInfoFilePath?: string }) => {
    if (!currentProjectPath) return;
    
    setIsSavingProject(true);
    setProjectSaveError(null);
    
    try {
      const updatedSettings = {
        ...projectSettings,
        ...newSettings,
      };
      await saveProjectSettings(updatedSettings);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save project settings';
      setProjectSaveError(errorMessage);
      console.error('Error saving project settings:', error);
    } finally {
      setIsSavingProject(false);
    }
  }, [currentProjectPath, projectSettings, saveProjectSettings]);

  // Save application settings
  const saveApplicationSettingsCallback = useCallback(async (newSettings: Partial<any>) => {
    setIsSavingApplication(true);
    setApplicationSaveError(null);
    
    try {
      const updatedSettings = {
        ...applicationSettings,
        ...newSettings,
      };
      await saveApplicationSettings(updatedSettings);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save application settings';
      setApplicationSaveError(errorMessage);
      console.error('Error saving application settings:', error);
    } finally {
      setIsSavingApplication(false);
    }
  }, [applicationSettings, saveApplicationSettings]);

  // Effect for saving debounced project name
  useEffect(() => {
    if (!projectSettings || !currentProjectPath) return;
    
    const originalValue = projectSettings.projectNameOverride || '';
    if (debouncedProjectName !== originalValue) {
      saveProjectSettingsCallback({ projectNameOverride: debouncedProjectName });
    }
  }, [debouncedProjectName, projectSettings, currentProjectPath, saveProjectSettingsCallback]);

  // Effect for saving debounced info file path
  useEffect(() => {
    if (!projectSettings || !currentProjectPath) return;
    
    const originalValue = projectSettings.projectInfoFilePath || '';
    if (debouncedInfoFilePath !== originalValue) {
      saveProjectSettingsCallback({ projectInfoFilePath: debouncedInfoFilePath });
    }
  }, [debouncedInfoFilePath, projectSettings, currentProjectPath, saveProjectSettingsCallback]);

  // Effect for saving debounced smart preview lines
  useEffect(() => {
    if (!applicationSettings) return;
    
    const originalValue = String(applicationSettings.defaultSmartPreviewLines || 15);
    if (debouncedSmartPreviewLines !== originalValue) {
      const numericValue = parseInt(debouncedSmartPreviewLines, 10);
      if (!isNaN(numericValue) && numericValue > 0 && numericValue <= 100) {
        saveApplicationSettingsCallback({ defaultSmartPreviewLines: numericValue });
      }
    }
  }, [debouncedSmartPreviewLines, applicationSettings, saveApplicationSettingsCallback]);

  const hasProject = fileTree.length > 0 && currentProjectPath;

  // Project settings handlers
  const handleProjectNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectNameOverride(e.target.value);
  };

  const handleInfoFilePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectInfoFilePath(e.target.value);
  };

  const handleProjectNameBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setProjectNameOverride(value);
  };

  const handleInfoFilePathBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setProjectInfoFilePath(value);
  };

  // Application settings handlers
  const handleExperimentalFeaturesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setEnableExperimentalFeatures(newValue);
    saveApplicationSettingsCallback({ enableExperimentalFeatures: newValue });
  };

  const handleAutoSaveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setAutoSaveEnabled(newValue);
    saveApplicationSettingsCallback({ autoSaveEnabled: newValue });
  };

  const handleSmartPreviewLinesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numeric input
    if (/^\d*$/.test(value) && value.length <= 3) {
      setDefaultSmartPreviewLines(value);
    }
  };

  const handleSmartPreviewLinesBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    const numericValue = parseInt(value, 10);
    
    // Validate and clamp the value
    if (isNaN(numericValue) || numericValue < 1) {
      setDefaultSmartPreviewLines('15'); // Reset to default
    } else if (numericValue > 100) {
      setDefaultSmartPreviewLines('100'); // Max value
    } else {
      setDefaultSmartPreviewLines(String(numericValue));
    }
  };

  return (
    <div className="flex flex-col h-full p-6 space-y-8">
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">
          Manage your project-specific and application-wide preferences.
        </p>
      </div>

      <div className="flex-1 space-y-8 overflow-y-auto">
        {/* Project Settings Section */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Project Settings</h2>
            {hasProject && (
              <span className="text-sm text-gray-500">
                {currentProjectPath}
              </span>
            )}
          </div>

          {!hasProject ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-lg mb-2">📁</div>
              <p className="text-gray-500">No project loaded</p>
              <p className="text-sm text-gray-400 mt-1">
                Open a project to view and edit project-specific settings.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {isLoadingProjectSettings ? (
                <div className="flex items-center justify-center py-4">
                  <div className="text-gray-500">Loading project settings...</div>
                </div>
              ) : (
                <>
                  {/* Error Display */}
                  {(projectSettingsError || projectSaveError) && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <div className="text-red-800 font-medium">Error with project settings</div>
                      <div className="text-red-600 text-sm mt-1">
                        {projectSaveError || projectSettingsError}
                      </div>
                    </div>
                  )}

                  {/* Project Name Override */}
                  <div className="space-y-2">
                    <label htmlFor="projectNameOverride" className="block text-sm font-medium text-gray-700">
                      Project Name Override
                    </label>
                    <input
                      id="projectNameOverride"
                      type="text"
                      value={projectNameOverride}
                      onChange={handleProjectNameChange}
                      onBlur={handleProjectNameBlur}
                      placeholder="Custom project display name (leave empty for default)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                      disabled={isLoadingProjectSettings || isSavingProject}
                    />
                    <p className="text-xs text-gray-500">
                      If provided, this name will be used instead of the folder name in prompts and display.
                    </p>
                  </div>

                  {/* Project Info File Path */}
                  <div className="space-y-2">
                    <label htmlFor="projectInfoFilePath" className="block text-sm font-medium text-gray-700">
                      Project Info File Path
                    </label>
                    <input
                      id="projectInfoFilePath"
                      type="text"
                      value={projectInfoFilePath}
                      onChange={handleInfoFilePathChange}
                      onBlur={handleInfoFilePathBlur}
                      placeholder="Relative path to project info file (e.g., docs/about.md)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                      disabled={isLoadingProjectSettings || isSavingProject}
                    />
                    <p className="text-xs text-gray-500">
                      Path relative to project root. If empty or invalid, Athanor will search for PROJECT.md, README.md, etc.
                    </p>
                  </div>

                  {/* Save Status */}
                  {isSavingProject && (
                    <div className="flex items-center text-sm text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Saving project settings...
                    </div>
                  )}

                  {/* Current Settings Display */}
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Current Settings:</h3>
                    <div className="bg-gray-50 border rounded-md p-4">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                        {projectSettings 
                          ? JSON.stringify(projectSettings, null, 2)
                          : 'No project settings file found\n(Using default values)'
                        }
                      </pre>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Settings are stored in <code>.ath_materials/project_settings.json</code>
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Application Settings Section */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Application Settings</h2>
            <span className="text-sm text-gray-500">Global</span>
          </div>

          <div className="space-y-6">
            {isLoadingApplicationSettings ? (
              <div className="flex items-center justify-center py-4">
                <div className="text-gray-500">Loading application settings...</div>
              </div>
            ) : (
              <>
                {/* Error Display */}
                {(applicationSettingsError || applicationSaveError) && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="text-red-800 font-medium">Error with application settings</div>
                    <div className="text-red-600 text-sm mt-1">
                      {applicationSaveError || applicationSettingsError}
                    </div>
                  </div>
                )}

                {/* Application Settings Form */}
                <div className="space-y-6">
                  {/* Experimental Features Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label htmlFor="enableExperimentalFeatures" className="block text-sm font-medium text-gray-700">
                        Enable Experimental Features
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Enables access to experimental features that are still in development.
                      </p>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <input
                        id="enableExperimentalFeatures"
                        type="checkbox"
                        checked={enableExperimentalFeatures}
                        onChange={handleExperimentalFeaturesChange}
                        disabled={isLoadingApplicationSettings || isSavingApplication}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Auto-Save Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label htmlFor="autoSaveEnabled" className="block text-sm font-medium text-gray-700">
                        Auto-Save Settings
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Automatically save changes to settings as you type.
                      </p>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <input
                        id="autoSaveEnabled"
                        type="checkbox"
                        checked={autoSaveEnabled}
                        onChange={handleAutoSaveChange}
                        disabled={isLoadingApplicationSettings || isSavingApplication}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Default Smart Preview Lines */}
                  <div className="space-y-2">
                    <label htmlFor="defaultSmartPreviewLines" className="block text-sm font-medium text-gray-700">
                      Default Smart Preview Lines
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        id="defaultSmartPreviewLines"
                        type="text"
                        value={defaultSmartPreviewLines}
                        onChange={handleSmartPreviewLinesChange}
                        onBlur={handleSmartPreviewLinesBlur}
                        placeholder="15"
                        className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                        disabled={isLoadingApplicationSettings || isSavingApplication}
                      />
                      <span className="text-sm text-gray-500">lines</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Default number of lines to show in smart preview mode (1-100).
                    </p>
                  </div>
                </div>

                {/* Save Status */}
                {isSavingApplication && (
                  <div className="flex items-center text-sm text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Saving application settings...
                  </div>
                )}

                {/* Current Settings Display */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Current Settings:</h3>
                  <div className="bg-gray-50 border rounded-md p-4">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                      {applicationSettings 
                        ? JSON.stringify(applicationSettings, null, 2)
                        : 'No application settings file found\n(Using default values)'
                      }
                    </pre>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Settings are stored in the application user data directory
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
