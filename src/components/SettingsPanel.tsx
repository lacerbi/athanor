// AI Summary: Enhanced settings panel with form inputs for both project and application settings.
// Features debounced saving, validation, error handling, and example application settings.

import React, { useEffect, useState, useCallback } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useFileSystemStore } from '../stores/fileSystemStore';
import { HelpCircle, Info } from 'lucide-react';
import { SETTINGS } from '../utils/constants';


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
  const [browseError, setBrowseError] = useState<string | null>(null);

  // Local state for application settings form inputs
  const [enableExperimentalFeatures, setEnableExperimentalFeatures] = useState(false);
  const [minSmartPreviewLines, setMinSmartPreviewLines] = useState('10');
  const [maxSmartPreviewLines, setMaxSmartPreviewLines] = useState('20');
  const [isSavingApplication, setIsSavingApplication] = useState(false);
  const [applicationSaveError, setApplicationSaveError] = useState<string | null>(null);

  
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
    const defaults = SETTINGS.defaults.application;
    if (applicationSettings) {
      setEnableExperimentalFeatures(applicationSettings.enableExperimentalFeatures ?? defaults.enableExperimentalFeatures);
      setMinSmartPreviewLines(String(applicationSettings.minSmartPreviewLines ?? defaults.minSmartPreviewLines));
      setMaxSmartPreviewLines(String(applicationSettings.maxSmartPreviewLines ?? defaults.maxSmartPreviewLines));
    } else {
      // Set default values when no application settings
      setEnableExperimentalFeatures(defaults.enableExperimentalFeatures);
      setMinSmartPreviewLines(String(defaults.minSmartPreviewLines));
      setMaxSmartPreviewLines(String(defaults.maxSmartPreviewLines));
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

  // Handle browse for project info file
  const handleBrowseProjectInfoFile = async () => {
    if (!hasProject) return;
    setBrowseError(null); // Clear previous error
    try {
      const relativePath = await window.fileService.selectProjectInfoFile();
      if (relativePath !== null) {
        setProjectInfoFilePath(relativePath);
      }
    } catch (error) {
      console.error('Error selecting project info file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to select file.';
      setBrowseError(errorMessage);
    }
  };

  // Handle clear project info file path
  const handleClearProjectInfoFile = () => {
    setProjectInfoFilePath('');
    setBrowseError(null); // Clear any browse error if path is cleared
  };

  // Project save button handler
  const handleSaveProjectSettings = () => {
    saveProjectSettingsCallback({ 
      projectNameOverride: projectNameOverride.trim(), 
      projectInfoFilePath: projectInfoFilePath.trim() 
    });
  };

  // Check if project settings have unsaved changes
  const hasUnsavedProjectChanges = 
    projectNameOverride !== (projectSettings?.projectNameOverride || '') ||
    projectInfoFilePath !== (projectSettings?.projectInfoFilePath || '');

  // Application settings handlers
  const handleExperimentalFeaturesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setEnableExperimentalFeatures(newValue);
  };

  // Application save button handler
  const handleSaveApplicationSettings = () => {
    const minValue = parseInt(minSmartPreviewLines, 10);
    const maxValue = parseInt(maxSmartPreviewLines, 10);
    
    // Validate and apply defaults/limits
    const validatedMin = isNaN(minValue) || minValue < 1 ? 10 : Math.min(minValue, 200);
    const validatedMax = isNaN(maxValue) || maxValue < 1 ? 20 : Math.min(maxValue, 200);
    
    // Ensure max >= min
    const finalMin = validatedMin;
    const finalMax = Math.max(validatedMax, validatedMin);
    
    saveApplicationSettingsCallback({ 
      enableExperimentalFeatures,
      minSmartPreviewLines: finalMin,
      maxSmartPreviewLines: finalMax
    });
  };

  // Check if application settings have unsaved changes
  const defaults = SETTINGS.defaults.application;
  const hasUnsavedApplicationChanges = 
    enableExperimentalFeatures !== (applicationSettings?.enableExperimentalFeatures ?? defaults.enableExperimentalFeatures) ||
    minSmartPreviewLines !== String(applicationSettings?.minSmartPreviewLines ?? defaults.minSmartPreviewLines) ||
    maxSmartPreviewLines !== String(applicationSettings?.maxSmartPreviewLines ?? defaults.maxSmartPreviewLines);

  const handleMinSmartPreviewLinesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numeric input
    if (/^\d*$/.test(value) && value.length <= 3) {
      setMinSmartPreviewLines(value);
    }
  };

  const handleMinSmartPreviewLinesBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    const numericValue = parseInt(value, 10);
    
    // Validate and clamp the value
    if (isNaN(numericValue) || numericValue < 1) {
      setMinSmartPreviewLines('10'); // Reset to default
    } else if (numericValue > 200) {
      setMinSmartPreviewLines('200'); // Max value
    } else {
      setMinSmartPreviewLines(String(numericValue));
      // Ensure max is at least equal to min
      const currentMax = parseInt(maxSmartPreviewLines, 10);
      if (!isNaN(currentMax) && currentMax < numericValue) {
        setMaxSmartPreviewLines(String(numericValue));
      }
    }
  };

  const handleMaxSmartPreviewLinesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numeric input
    if (/^\d*$/.test(value) && value.length <= 3) {
      setMaxSmartPreviewLines(value);
    }
  };

  const handleMaxSmartPreviewLinesBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    const numericValue = parseInt(value, 10);
    
    // Validate and clamp the value
    if (isNaN(numericValue) || numericValue < 1) {
      setMaxSmartPreviewLines('20'); // Reset to default
    } else if (numericValue > 200) {
      setMaxSmartPreviewLines('200'); // Max value
    } else {
      // Ensure max is at least equal to min
      const currentMin = parseInt(minSmartPreviewLines, 10);
      const finalMax = !isNaN(currentMin) ? Math.max(numericValue, currentMin) : numericValue;
      setMaxSmartPreviewLines(String(finalMax));
    }
  };

  return (
    <div className="flex flex-col h-full p-6">
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
                    <div className="flex items-center space-x-2">
                      <label htmlFor="projectNameOverride" className="block text-sm font-medium text-gray-700">
                        Project Name Override
                      </label>
                      <div 
                        className="relative group"
                        title="If provided, this name will be used instead of the folder name in prompts and display."
                      >
                        <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                      </div>
                    </div>
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
                  </div>

                  {/* Project Info File Path */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <label htmlFor="projectInfoFilePath" className="block text-sm font-medium text-gray-700">
                        Project Info File Path
                      </label>
                      <div 
                        className="relative group"
                        title="Path relative to project root. If empty or invalid, Athanor will search for PROJECT.md, README.md, etc."
                      >
                        <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        id="projectInfoFilePath"
                        type="text"
                        value={projectInfoFilePath}
                        onChange={handleInfoFilePathChange}
                        onBlur={handleInfoFilePathBlur}
                        placeholder="Relative path to project info file (e.g., docs/about.md)"
                        className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                        disabled={isLoadingProjectSettings || isSavingProject}
                      />
                      <button
                        type="button"
                        onClick={handleBrowseProjectInfoFile}
                        disabled={!hasProject || isLoadingProjectSettings || isSavingProject}
                        className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Browse for project info file"
                      >
                        Browse...
                      </button>
                      <button
                        type="button"
                        onClick={handleClearProjectInfoFile}
                        disabled={!hasProject || isLoadingProjectSettings || isSavingProject || !projectInfoFilePath}
                        className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Clear project info file path"
                      >
                        Clear
                      </button>
                    </div>
                    {browseError && (
                      <p className="text-sm text-red-600 mt-1">{browseError}</p>
                    )}
                  </div>

                  {/* Save Project Settings Button */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={handleSaveProjectSettings}
                      disabled={isLoadingProjectSettings || isSavingProject || !hasUnsavedProjectChanges || !hasProject}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save Project Settings
                    </button>
                    
                    <div className="flex items-center">
                      {/* Save Status */}
                      {isSavingProject && (
                        <div className="flex items-center text-sm text-blue-600 mr-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                          Saving project settings...
                        </div>
                      )}

                      {/* Info Icon for Project Settings */}
                      {hasProject && !isLoadingProjectSettings && (
                        <div
                          className="relative group"
                          title={
                            `Current Settings:\n${
                              projectSettings
                                ? JSON.stringify(projectSettings, null, 2)
                                : 'No project settings file found or loaded.\n(Using default values or awaiting load)'
                            }\n\n` +
                            `Settings are stored in .ath_materials/project_settings.json`
                          }
                        >
                          <Info className="w-5 h-5 text-gray-500 cursor-help hover:text-gray-700" />
                        </div>
                      )}
                    </div>
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
                    <div className="flex items-center space-x-2">
                      <label htmlFor="enableExperimentalFeatures" className="block text-sm font-medium text-gray-700">
                        Enable Experimental Features
                      </label>
                      <div 
                        className="relative group"
                        title="Enables access to experimental features that are still in development."
                      >
                        <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                      </div>
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

                  {/* Min Smart Preview Lines */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <label htmlFor="minSmartPreviewLines" className="block text-sm font-medium text-gray-700">
                        Min Smart Preview Lines
                      </label>
                      <div 
                        className="relative group"
                        title="Minimum number of lines to show in smart preview mode (1-200)."
                      >
                        <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        id="minSmartPreviewLines"
                        type="text"
                        value={minSmartPreviewLines}
                        onChange={handleMinSmartPreviewLinesChange}
                        onBlur={handleMinSmartPreviewLinesBlur}
                        placeholder="10"
                        className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                        disabled={isLoadingApplicationSettings || isSavingApplication}
                      />
                      <span className="text-sm text-gray-500">lines</span>
                    </div>
                  </div>

                  {/* Max Smart Preview Lines */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <label htmlFor="maxSmartPreviewLines" className="block text-sm font-medium text-gray-700">
                        Max Smart Preview Lines
                      </label>
                      <div 
                        className="relative group"
                        title="Maximum number of lines to show in smart preview mode (1-200). Must be >= min lines."
                      >
                        <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        id="maxSmartPreviewLines"
                        type="text"
                        value={maxSmartPreviewLines}
                        onChange={handleMaxSmartPreviewLinesChange}
                        onBlur={handleMaxSmartPreviewLinesBlur}
                        placeholder="20"
                        className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                        disabled={isLoadingApplicationSettings || isSavingApplication}
                      />
                      <span className="text-sm text-gray-500">lines</span>
                    </div>
                  </div>
                </div>

                {/* Save Application Settings Button */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleSaveApplicationSettings}
                    disabled={isLoadingApplicationSettings || isSavingApplication || !hasUnsavedApplicationChanges}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Application Settings
                  </button>
                  
                  <div className="flex items-center">
                    {/* Save Status */}
                    {isSavingApplication && (
                      <div className="flex items-center text-sm text-blue-600 mr-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        Saving application settings...
                      </div>
                    )}

                    {/* Info Icon for Application Settings */}
                    {!isLoadingApplicationSettings && (
                      <div
                        className="relative group"
                        title={
                          `Current Settings:\n${
                            applicationSettings
                              ? JSON.stringify(applicationSettings, null, 2)
                              : 'No application settings file found or loaded.\n(Using default values or awaiting load)'
                          }\n\n` +
                          `Settings are stored in the application user data directory`
                        }
                      >
                        <Info className="w-5 h-5 text-gray-500 cursor-help hover:text-gray-700" />
                      </div>
                    )}
                  </div>
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
