// AI Summary: Component for managing project-specific settings.
// Allows users to override project name and specify a project information file.
// Handles form state, validation, and saving of project settings.

import React, { useEffect, useState, useCallback } from 'react';
import { HelpCircle, Info } from 'lucide-react';
import type { ProjectSettings } from '../types/global';

interface ProjectSettingsPaneProps {
  projectSettings: ProjectSettings | null;
  isLoadingProjectSettings: boolean;
  projectSettingsError: string | null;
  currentProjectPath: string | null;
  saveProjectSettings: (settings: ProjectSettings) => Promise<void>;
  hasProject: boolean;
  selectProjectInfoFile: () => Promise<string | null>;
}

const ProjectSettingsPane: React.FC<ProjectSettingsPaneProps> = ({
  projectSettings,
  isLoadingProjectSettings,
  projectSettingsError,
  currentProjectPath,
  saveProjectSettings,
  hasProject,
  selectProjectInfoFile,
}) => {
  // Local state for project settings form inputs
  const [projectNameOverride, setProjectNameOverride] = useState('');
  const [projectInfoFilePath, setProjectInfoFilePath] = useState('');
  const [includeAiSummaries, setIncludeAiSummaries] = useState(true);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [projectSaveError, setProjectSaveError] = useState<string | null>(null);
  const [browseError, setBrowseError] = useState<string | null>(null);

  // Update local state when projectSettings changes
  useEffect(() => {
    if (projectSettings) {
      setProjectNameOverride(projectSettings.projectNameOverride || '');
      setProjectInfoFilePath(projectSettings.projectInfoFilePath || '');
      setIncludeAiSummaries(projectSettings.includeAiSummaries ?? true);
    } else {
      // Clear form when no project settings
      setProjectNameOverride('');
      setProjectInfoFilePath('');
      setIncludeAiSummaries(true);
    }
    // Clear any previous save errors when settings load
    setProjectSaveError(null);
  }, [projectSettings]);

  // Save project settings callback
  const saveProjectSettingsCallback = useCallback(
    async (newSettings: {
      projectNameOverride?: string;
      projectInfoFilePath?: string;
      includeAiSummaries?: boolean;
    }) => {
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
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to save project settings';
        setProjectSaveError(errorMessage);
        console.error('Error saving project settings:', error);
      } finally {
        setIsSavingProject(false);
      }
    },
    [currentProjectPath, projectSettings, saveProjectSettings]
  );

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

  const handleIncludeAiSummariesChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setIncludeAiSummaries(e.target.checked);
  };

  // Handle browse for project info file
  const handleBrowseProjectInfoFile = async () => {
    if (!hasProject) return;
    setBrowseError(null); // Clear previous error
    try {
      const relativePath = await selectProjectInfoFile();
      if (relativePath !== null) {
        setProjectInfoFilePath(relativePath);
      }
    } catch (error) {
      console.error('Error selecting project info file:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to select file.';
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
      projectInfoFilePath: projectInfoFilePath.trim(),
      includeAiSummaries: includeAiSummaries,
    });
  };

  // Check if project settings have unsaved changes
  const hasUnsavedProjectChanges =
    projectNameOverride !== (projectSettings?.projectNameOverride || '') ||
    projectInfoFilePath !== (projectSettings?.projectInfoFilePath || '') ||
    includeAiSummaries !== (projectSettings?.includeAiSummaries ?? true);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 h-fit">
      <div className="flex items-center justify-between mb-4 gap-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-shrink-0">
          Project Settings
        </h2>
        {hasProject && (
          <span
            className="text-sm text-gray-500 dark:text-gray-400 truncate min-w-0"
            style={{ direction: 'rtl', textAlign: 'left' }}
            title={currentProjectPath || undefined}
          >
            {currentProjectPath}
          </span>
        )}
      </div>

      {!hasProject ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-lg mb-2">📁</div>
          <p className="text-gray-500 dark:text-gray-400">No project loaded</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Open a project to view and edit project-specific settings.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {isLoadingProjectSettings ? (
            <div className="flex items-center justify-center py-4">
              <div className="text-gray-500 dark:text-gray-400">
                Loading project settings...
              </div>
            </div>
          ) : (
            <>
              {/* Error Display */}
              {(projectSettingsError || projectSaveError) && (
                <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md p-4">
                  <div className="text-red-800 dark:text-red-200 font-medium">
                    Error with project settings
                  </div>
                  <div className="text-red-600 dark:text-red-300 text-sm mt-1">
                    {projectSaveError || projectSettingsError}
                  </div>
                </div>
              )}

              {/* Project Name */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label
                    htmlFor="projectNameOverride"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Project Name
                  </label>
                  <div
                    className="relative group"
                    title="If provided, this name will be used instead of the folder name in prompts and display."
                  >
                    <HelpCircle className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" />
                  </div>
                </div>
                <input
                  id="projectNameOverride"
                  type="text"
                  value={projectNameOverride}
                  onChange={handleProjectNameChange}
                  onBlur={handleProjectNameBlur}
                  placeholder="Custom project display name (leave empty for default)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 disabled:bg-gray-50 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400"
                  disabled={isLoadingProjectSettings || isSavingProject}
                />
              </div>

              {/* Project Info File Path */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label
                    htmlFor="projectInfoFilePath"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Project Info File
                  </label>
                  <div
                    className="relative group"
                    title="File with project information. If empty or invalid, Athanor will search for PROJECT.md, README.md, etc."
                  >
                    <HelpCircle className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" />
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
                    className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 disabled:bg-gray-50 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400"
                    disabled={isLoadingProjectSettings || isSavingProject}
                  />
                  <button
                    type="button"
                    onClick={handleBrowseProjectInfoFile}
                    disabled={
                      !hasProject || isLoadingProjectSettings || isSavingProject
                    }
                    className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Browse for project info file"
                  >
                    Browse...
                  </button>
                  <button
                    type="button"
                    onClick={handleClearProjectInfoFile}
                    disabled={
                      !hasProject ||
                      isLoadingProjectSettings ||
                      isSavingProject ||
                      !projectInfoFilePath
                    }
                    className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Clear project info file path"
                  >
                    Clear
                  </button>
                </div>
                {browseError && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {browseError}
                  </p>
                )}
              </div>

              {/* Include AI Summaries */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label
                    htmlFor="includeAiSummaries"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Include AI Summaries
                  </label>
                  <div
                    className="relative group"
                    title="When enabled, Athanor's prompts will include information about adding AI Summaries at the beginning of each file. Some prompts and features will work better if these summaries are present."
                  >
                    <HelpCircle className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" />
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    id="includeAiSummaries"
                    type="checkbox"
                    checked={includeAiSummaries}
                    onChange={handleIncludeAiSummariesChange}
                    disabled={isLoadingProjectSettings || isSavingProject}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                  />
                  <label
                    htmlFor="includeAiSummaries"
                    className="ml-2 text-sm text-gray-600 dark:text-gray-400"
                  >
                    Add AI summaries at the beginning of files
                  </label>
                </div>
              </div>

              {/* Save Project Settings Button */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleSaveProjectSettings}
                  disabled={
                    isLoadingProjectSettings ||
                    isSavingProject ||
                    !hasUnsavedProjectChanges ||
                    !hasProject
                  }
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Project Settings
                </button>

                <div className="flex items-center">
                  {/* Save Status */}
                  {isSavingProject && (
                    <div className="flex items-center text-sm text-blue-600 dark:text-blue-400 mr-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400 mr-2"></div>
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
                      <Info className="w-5 h-5 text-gray-500 dark:text-gray-400 cursor-help hover:text-gray-700 dark:hover:text-gray-300" />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectSettingsPane;
