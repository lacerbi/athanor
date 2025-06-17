// AI Summary: Component for managing global application settings including experimental features,
// smart preview line limits, and threshold line length with form validation and debounced saving.

import React, { useEffect, useState, useCallback } from 'react';
import { HelpCircle, Info } from 'lucide-react';
import type { ApplicationSettings } from '../types/global';
import { SETTINGS } from '../utils/constants';

interface ApplicationSettingsPaneProps {
  applicationSettings: ApplicationSettings | null;
  isLoadingApplicationSettings: boolean;
  applicationSettingsError: string | null;
  saveApplicationSettings: (settings: ApplicationSettings) => Promise<void>;
  applicationDefaults: ApplicationSettings;
}

const ApplicationSettingsPane: React.FC<ApplicationSettingsPaneProps> = ({
  applicationSettings,
  isLoadingApplicationSettings,
  applicationSettingsError,
  saveApplicationSettings,
  applicationDefaults,
}) => {
  // Local state for application settings form inputs
  const [enableExperimentalFeatures, setEnableExperimentalFeatures] = useState<boolean>(
    SETTINGS.defaults.application.enableExperimentalFeatures
  );
  const [minSmartPreviewLines, setMinSmartPreviewLines] = useState<string>(
    String(SETTINGS.defaults.application.minSmartPreviewLines)
  );
  const [maxSmartPreviewLines, setMaxSmartPreviewLines] = useState<string>(
    String(SETTINGS.defaults.application.maxSmartPreviewLines)
  );
  const [thresholdLineLengthInput, setThresholdLineLengthInput] = useState<string>(
    String(SETTINGS.defaults.application.thresholdLineLength)
  );
  const [maxSmartContextTokens, setMaxSmartContextTokens] = useState<string>(
    String(SETTINGS.defaults.application.maxSmartContextTokens)
  );
  const [uiTheme, setUiTheme] = useState<string>(
    SETTINGS.defaults.application.uiTheme
  );
  const [isSavingApplication, setIsSavingApplication] = useState(false);
  const [applicationSaveError, setApplicationSaveError] = useState<
    string | null
  >(null);

  // Update local state when applicationSettings changes
  useEffect(() => {
    const defaults = SETTINGS.defaults.application;
    if (applicationSettings) {
      setEnableExperimentalFeatures(
        applicationSettings.enableExperimentalFeatures ??
          applicationDefaults.enableExperimentalFeatures ??
          defaults.enableExperimentalFeatures
      );
      setMinSmartPreviewLines(
        String(
          applicationSettings.minSmartPreviewLines ??
            applicationDefaults.minSmartPreviewLines ??
            defaults.minSmartPreviewLines
        )
      );
      setMaxSmartPreviewLines(
        String(
          applicationSettings.maxSmartPreviewLines ??
            applicationDefaults.maxSmartPreviewLines ??
            defaults.maxSmartPreviewLines
        )
      );
      setThresholdLineLengthInput(
        String(
          applicationSettings.thresholdLineLength ??
            applicationDefaults.thresholdLineLength ??
            defaults.thresholdLineLength
        )
      );
      setMaxSmartContextTokens(
        String(
          applicationSettings.maxSmartContextTokens ??
            applicationDefaults.maxSmartContextTokens ??
            defaults.maxSmartContextTokens
        )
      );
      setUiTheme(
        applicationSettings.uiTheme ??
          applicationDefaults.uiTheme ??
          defaults.uiTheme
      );
    } else {
      // Set default values when no application settings
      setEnableExperimentalFeatures(
        applicationDefaults.enableExperimentalFeatures ??
          defaults.enableExperimentalFeatures
      );
      setMinSmartPreviewLines(
        String(
          applicationDefaults.minSmartPreviewLines ??
            defaults.minSmartPreviewLines
        )
      );
      setMaxSmartPreviewLines(
        String(
          applicationDefaults.maxSmartPreviewLines ??
            defaults.maxSmartPreviewLines
        )
      );
      setThresholdLineLengthInput(
        String(
          applicationDefaults.thresholdLineLength ??
            defaults.thresholdLineLength
        )
      );
      setMaxSmartContextTokens(
        String(
          applicationDefaults.maxSmartContextTokens ??
            defaults.maxSmartContextTokens
        )
      );
      setUiTheme(
        applicationDefaults.uiTheme ??
          defaults.uiTheme
      );
    }
    // Clear any previous save errors when settings load
    setApplicationSaveError(null);
  }, [applicationSettings, applicationDefaults]);

  // Save application settings
  const saveApplicationSettingsCallback = useCallback(
    async (newSettings: Partial<ApplicationSettings>) => {
      setIsSavingApplication(true);
      setApplicationSaveError(null);

      try {
        const updatedSettings = {
          ...applicationSettings,
          ...newSettings,
        };
        await saveApplicationSettings(updatedSettings);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to save application settings';
        setApplicationSaveError(errorMessage);
        console.error('Error saving application settings:', error);
      } finally {
        setIsSavingApplication(false);
      }
    },
    [applicationSettings, saveApplicationSettings]
  );

  // Application settings handlers
  const handleExperimentalFeaturesChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = e.target.checked;
    setEnableExperimentalFeatures(newValue);
  };

  const handleUiThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setUiTheme(e.target.value);
  };

  // Application save button handler
  const handleSaveApplicationSettings = () => {
    const minValue = parseInt(minSmartPreviewLines, 10);
    const maxValue = parseInt(maxSmartPreviewLines, 10);
    const thresholdValue = parseInt(thresholdLineLengthInput, 10);
    const tokenLimitValue = parseInt(maxSmartContextTokens, 10);

    // Validate and apply defaults/limits
    const defaults = SETTINGS.defaults.application;
    const validatedMin =
      isNaN(minValue) || minValue < 1
        ? defaults.minSmartPreviewLines
        : Math.min(minValue, 200);
    const validatedMax =
      isNaN(maxValue) || maxValue < 1
        ? defaults.maxSmartPreviewLines
        : Math.min(maxValue, 200);
    const validatedThreshold =
      isNaN(thresholdValue) || thresholdValue < 50
        ? (applicationDefaults.thresholdLineLength ??
          defaults.thresholdLineLength)
        : Math.min(thresholdValue, 2000);
    const validatedTokenLimit =
      isNaN(tokenLimitValue) || tokenLimitValue < 0
        ? (applicationDefaults.maxSmartContextTokens ??
          defaults.maxSmartContextTokens)
        : Math.min(tokenLimitValue, 100000);

    // Ensure max >= min
    const finalMin = validatedMin;
    const finalMax = Math.max(validatedMax, validatedMin);

    saveApplicationSettingsCallback({
      enableExperimentalFeatures,
      minSmartPreviewLines: finalMin,
      maxSmartPreviewLines: finalMax,
      thresholdLineLength: validatedThreshold,
      maxSmartContextTokens: validatedTokenLimit,
      uiTheme,
    });
  };

  // Check if application settings have unsaved changes
  const defaults = SETTINGS.defaults.application;
  const hasUnsavedApplicationChanges =
    enableExperimentalFeatures !==
      (applicationSettings?.enableExperimentalFeatures ??
        applicationDefaults.enableExperimentalFeatures ??
        defaults.enableExperimentalFeatures) ||
    minSmartPreviewLines !==
      String(
        applicationSettings?.minSmartPreviewLines ??
          applicationDefaults.minSmartPreviewLines ??
          defaults.minSmartPreviewLines
      ) ||
    maxSmartPreviewLines !==
      String(
        applicationSettings?.maxSmartPreviewLines ??
          applicationDefaults.maxSmartPreviewLines ??
          defaults.maxSmartPreviewLines
      ) ||
    thresholdLineLengthInput !==
      String(
        applicationSettings?.thresholdLineLength ??
          applicationDefaults.thresholdLineLength ??
          defaults.thresholdLineLength
      ) ||
    uiTheme !==
      (applicationSettings?.uiTheme ??
        applicationDefaults.uiTheme ??
        defaults.uiTheme) ||
    maxSmartContextTokens !==
      String(
        applicationSettings?.maxSmartContextTokens ??
          applicationDefaults.maxSmartContextTokens ??
          defaults.maxSmartContextTokens
      );

  const handleMinSmartPreviewLinesChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    // Allow only numeric input
    if (/^\d*$/.test(value) && value.length <= 3) {
      setMinSmartPreviewLines(value);
    }
  };

  const handleMinSmartPreviewLinesBlur = (
    e: React.FocusEvent<HTMLInputElement>
  ) => {
    const value = e.target.value.trim();
    const numericValue = parseInt(value, 10);

    // Validate and clamp the value
    if (isNaN(numericValue) || numericValue < 1) {
      setMinSmartPreviewLines(
        String(SETTINGS.defaults.application.minSmartPreviewLines)
      ); // Reset to default
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

  const handleMaxSmartPreviewLinesChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    // Allow only numeric input
    if (/^\d*$/.test(value) && value.length <= 3) {
      setMaxSmartPreviewLines(value);
    }
  };

  const handleMaxSmartPreviewLinesBlur = (
    e: React.FocusEvent<HTMLInputElement>
  ) => {
    const value = e.target.value.trim();
    const numericValue = parseInt(value, 10);

    // Validate and clamp the value
    if (isNaN(numericValue) || numericValue < 1) {
      setMaxSmartPreviewLines(
        String(SETTINGS.defaults.application.maxSmartPreviewLines)
      ); // Reset to default
    } else if (numericValue > 200) {
      setMaxSmartPreviewLines('200'); // Max value
    } else {
      // Ensure max is at least equal to min
      const currentMin = parseInt(minSmartPreviewLines, 10);
      const finalMax = !isNaN(currentMin)
        ? Math.max(numericValue, currentMin)
        : numericValue;
      setMaxSmartPreviewLines(String(finalMax));
    }
  };

  const handleThresholdLineLengthChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    // Allow only numeric input
    if (/^\d*$/.test(value) && value.length <= 4) {
      setThresholdLineLengthInput(value);
    }
  };

  const handleThresholdLineLengthBlur = (
    e: React.FocusEvent<HTMLInputElement>
  ) => {
    const value = e.target.value.trim();
    const numericValue = parseInt(value, 10);

    // Validate and clamp the value
    if (isNaN(numericValue) || numericValue < 50) {
      setThresholdLineLengthInput(
        String(
          applicationDefaults.thresholdLineLength ??
            SETTINGS.defaults.application.thresholdLineLength
        )
      ); // Reset to default
    } else if (numericValue > 2000) {
      setThresholdLineLengthInput('2000'); // Max value
    } else {
      setThresholdLineLengthInput(String(numericValue));
    }
  };

  const handleMaxSmartContextTokensChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    // Allow only numeric input
    if (/^\d*$/.test(value) && value.length <= 6) {
      setMaxSmartContextTokens(value);
    }
  };

  const handleMaxSmartContextTokensBlur = (
    e: React.FocusEvent<HTMLInputElement>
  ) => {
    const value = e.target.value.trim();
    const numericValue = parseInt(value, 10);

    // Validate and clamp the value
    if (isNaN(numericValue) || numericValue < 0) {
      setMaxSmartContextTokens(
        String(
          applicationDefaults.maxSmartContextTokens ??
            SETTINGS.defaults.application.maxSmartContextTokens
        )
      ); // Reset to default
    } else if (numericValue > 100000) {
      setMaxSmartContextTokens('100000'); // Max value
    } else {
      setMaxSmartContextTokens(String(numericValue));
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 h-fit">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Application Settings
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">Global</span>
      </div>

      <div className="space-y-6">
        {isLoadingApplicationSettings ? (
          <div className="flex items-center justify-center py-4">
            <div className="text-gray-500 dark:text-gray-400">Loading application settings...</div>
          </div>
        ) : (
          <>
            {/* Error Display */}
            {(applicationSettingsError || applicationSaveError) && (
              <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md p-4">
                <div className="text-red-800 dark:text-red-200 font-medium">
                  Error with application settings
                </div>
                <div className="text-red-600 dark:text-red-300 text-sm mt-1">
                  {applicationSaveError || applicationSettingsError}
                </div>
              </div>
            )}

            {/* Application Settings Form */}
            <div className="space-y-6">
              {/* UI Theme Selection */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label
                    htmlFor="uiTheme"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    UI Theme
                  </label>
                  <div
                    className="relative group"
                    title="Choose the visual theme for the application. Auto follows your system theme preference."
                  >
                    <HelpCircle className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" />
                  </div>
                </div>
                <select
                  id="uiTheme"
                  value={uiTheme}
                  onChange={handleUiThemeChange}
                  disabled={isLoadingApplicationSettings || isSavingApplication}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 disabled:bg-gray-50 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400"
                >
                  <option value="Light">Light</option>
                  <option value="Dark">Dark</option>
                  <option value="Auto">Auto (System)</option>
                </select>
              </div>

              {/* Experimental Features Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <label
                    htmlFor="enableExperimentalFeatures"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Enable Experimental Features
                  </label>
                  <div
                    className="relative group"
                    title="Enables access to experimental features that are still in development."
                  >
                    <HelpCircle className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" />
                  </div>
                </div>
                <div className="flex-shrink-0 ml-4">
                  <input
                    id="enableExperimentalFeatures"
                    type="checkbox"
                    checked={enableExperimentalFeatures}
                    onChange={handleExperimentalFeaturesChange}
                    disabled={
                      isLoadingApplicationSettings || isSavingApplication
                    }
                    className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Smart Preview Lines Range */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Smart Preview Lines Range
                  </label>
                  <div
                    className="relative group"
                    title="Range of lines to show in smart preview mode. Min: 1-200, Max: 1-200 (must be >= min)."
                  >
                    <HelpCircle className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <label
                      htmlFor="minSmartPreviewLines"
                      className="text-sm text-gray-600 dark:text-gray-300"
                    >
                      Min:
                    </label>
                    <input
                      id="minSmartPreviewLines"
                      type="text"
                      value={minSmartPreviewLines}
                      onChange={handleMinSmartPreviewLinesChange}
                      onBlur={handleMinSmartPreviewLinesBlur}
                      placeholder="10"
                      className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 disabled:bg-gray-50 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400"
                      disabled={
                        isLoadingApplicationSettings || isSavingApplication
                      }
                    />
                  </div>
                  <span className="text-gray-400 dark:text-gray-500">–</span>
                  <div className="flex items-center space-x-2">
                    <label
                      htmlFor="maxSmartPreviewLines"
                      className="text-sm text-gray-600 dark:text-gray-300"
                    >
                      Max:
                    </label>
                    <input
                      id="maxSmartPreviewLines"
                      type="text"
                      value={maxSmartPreviewLines}
                      onChange={handleMaxSmartPreviewLinesChange}
                      onBlur={handleMaxSmartPreviewLinesBlur}
                      placeholder="20"
                      className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 disabled:bg-gray-50 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400"
                      disabled={
                        isLoadingApplicationSettings || isSavingApplication
                      }
                    />
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">lines</span>
                </div>
              </div>

              {/* Threshold Line Length */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label
                    htmlFor="thresholdLineLength"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    File Size Threshold
                  </label>
                  <div
                    className="relative group"
                    title="File size (number of lines) after which a file is considered large for warnings or special handling (50-2000). Default: 200."
                  >
                    <HelpCircle className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    id="thresholdLineLength"
                    type="text"
                    value={thresholdLineLengthInput}
                    onChange={handleThresholdLineLengthChange}
                    onBlur={handleThresholdLineLengthBlur}
                    placeholder="200"
                    className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 disabled:bg-gray-50 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400"
                    disabled={
                      isLoadingApplicationSettings || isSavingApplication
                    }
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">lines</span>
                </div>
              </div>

              {/* Smart Context Token Limit */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label
                    htmlFor="maxSmartContextTokens"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Smart Context Token Limit
                  </label>
                  <div
                    className="relative group"
                    title="Maximum tokens for files added by Smart Context. Set to 0 to disable. (0-100000). Default: 10000."
                  >
                    <HelpCircle className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    id="maxSmartContextTokens"
                    type="text"
                    value={maxSmartContextTokens}
                    onChange={handleMaxSmartContextTokensChange}
                    onBlur={handleMaxSmartContextTokensBlur}
                    placeholder="10000"
                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 disabled:bg-gray-50 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400"
                    disabled={
                      isLoadingApplicationSettings || isSavingApplication
                    }
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">tokens</span>
                </div>
              </div>
            </div>

            {/* Save Application Settings Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleSaveApplicationSettings}
                disabled={
                  isLoadingApplicationSettings ||
                  isSavingApplication ||
                  !hasUnsavedApplicationChanges
                }
                className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Application Settings
              </button>

              <div className="flex items-center">
                {/* Save Status */}
                {isSavingApplication && (
                  <div className="flex items-center text-sm text-blue-600 dark:text-blue-400 mr-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400 mr-2"></div>
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
                    <Info className="w-5 h-5 text-gray-500 dark:text-gray-400 cursor-help hover:text-gray-700 dark:hover:text-gray-300" />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ApplicationSettingsPane;
