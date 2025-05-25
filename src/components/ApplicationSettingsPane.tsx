// AI Summary: Component for managing global application settings and API keys.
// Allows users to configure experimental features, smart preview line limits, threshold line length,
// and manage API keys for different providers with secure storage and display functionality.

import React, { useEffect, useState, useCallback } from 'react';
import { HelpCircle, Info, Eye, EyeOff, Save, Trash2, Check } from 'lucide-react';
import type { ApplicationSettings } from '../types/global';
import { SETTINGS } from '../utils/constants';
import { ApiKeyServiceRenderer } from '../../electron/modules/secure-api-storage/renderer';
import type { ApiProvider } from '../../electron/modules/secure-api-storage/common';
import { ApiKeyStorageError } from '../../electron/modules/secure-api-storage/common';

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
  const [enableExperimentalFeatures, setEnableExperimentalFeatures] = useState(
    SETTINGS.defaults.application.enableExperimentalFeatures
  );
  const [minSmartPreviewLines, setMinSmartPreviewLines] = useState(
    String(SETTINGS.defaults.application.minSmartPreviewLines)
  );
  const [maxSmartPreviewLines, setMaxSmartPreviewLines] = useState(
    String(SETTINGS.defaults.application.maxSmartPreviewLines)
  );
  const [thresholdLineLengthInput, setThresholdLineLengthInput] = useState(
    String(SETTINGS.defaults.application.thresholdLineLength)
  );
  const [isSavingApplication, setIsSavingApplication] = useState(false);
  const [applicationSaveError, setApplicationSaveError] = useState<
    string | null
  >(null);

  // API Key Management state
  const [apiKeyService, setApiKeyService] = useState<ApiKeyServiceRenderer | null>(null);
  const [availableProviders, setAvailableProviders] = useState<ApiProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ApiProvider | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [currentKeyDisplayInfo, setCurrentKeyDisplayInfo] = useState<{ isStored: boolean, lastFourChars?: string } | null>(null);
  const [isKeyInfoLoading, setIsKeyInfoLoading] = useState<boolean>(false);
  const [keyOpError, setKeyOpError] = useState<string | null>(null);
  const [isKeyProcessing, setIsKeyProcessing] = useState<boolean>(false);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  // Initialize API Key Service
  useEffect(() => {
    try {
      const service = new ApiKeyServiceRenderer();
      setApiKeyService(service);
    } catch (error) {
      console.error('Failed to initialize ApiKeyServiceRenderer:', error);
      setKeyOpError('Failed to initialize API key service. Please restart the application.');
    }
  }, []);

  // Load available providers when service is ready
  useEffect(() => {
    if (apiKeyService) {
      try {
        const providers = apiKeyService.getAvailableProviders();
        setAvailableProviders(providers);
        if (providers.length > 0 && !selectedProvider) {
          setSelectedProvider(providers[0]);
        }
      } catch (error) {
        console.error('Failed to get available providers:', error);
        setKeyOpError('Failed to load API providers.');
      }
    }
  }, [apiKeyService, selectedProvider]);

  // Fetch key display info when selected provider changes
  useEffect(() => {
    if (selectedProvider && apiKeyService) {
      setIsKeyInfoLoading(true);
      setKeyOpError(null);
      setApiKeyInput(''); // Clear input when switching providers
      setShowApiKey(false); // Reset visibility when switching providers
      
      apiKeyService.getApiKeyDisplayInfo(selectedProvider)
        .then((info) => {
          setCurrentKeyDisplayInfo(info);
        })
        .catch((error) => {
          console.error('Failed to get key display info:', error);
          setKeyOpError(error instanceof ApiKeyStorageError ? error.message : 'Failed to get key information.');
          setCurrentKeyDisplayInfo(null);
        })
        .finally(() => {
          setIsKeyInfoLoading(false);
        });
    }
  }, [selectedProvider, apiKeyService]);

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

  // Application save button handler
  const handleSaveApplicationSettings = () => {
    const minValue = parseInt(minSmartPreviewLines, 10);
    const maxValue = parseInt(maxSmartPreviewLines, 10);
    const thresholdValue = parseInt(thresholdLineLengthInput, 10);

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

    // Ensure max >= min
    const finalMin = validatedMin;
    const finalMax = Math.max(validatedMax, validatedMin);

    saveApplicationSettingsCallback({
      enableExperimentalFeatures,
      minSmartPreviewLines: finalMin,
      maxSmartPreviewLines: finalMax,
      thresholdLineLength: validatedThreshold,
    });
  };

  // API Key Management handlers
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as ApiProvider;
    setSelectedProvider(newProvider);
  };

  const handleApiKeyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKeyInput(e.target.value);
    // Clear any previous errors when user starts typing
    if (keyOpError) {
      setKeyOpError(null);
    }
  };

  const toggleApiKeyVisibility = () => {
    setShowApiKey(!showApiKey);
  };

  const handleSaveApiKey = async () => {
    if (!selectedProvider || !apiKeyService || !apiKeyInput.trim() || currentKeyDisplayInfo?.isStored) {
      return;
    }

    // Client-side validation
    if (!apiKeyService.validateApiKeyFormat(selectedProvider, apiKeyInput.trim())) {
      setKeyOpError(`Invalid API key format for ${selectedProvider}. Please check your key and try again.`);
      return;
    }

    setIsKeyProcessing(true);
    setKeyOpError(null);

    try {
      await apiKeyService.storeKey(selectedProvider, apiKeyInput.trim());
      
      // Clear input and reset visibility
      setApiKeyInput('');
      setShowApiKey(false);
      
      // Refresh key display info
      const updatedInfo = await apiKeyService.getApiKeyDisplayInfo(selectedProvider);
      setCurrentKeyDisplayInfo(updatedInfo);
      
      console.log(`API key saved successfully for ${selectedProvider}`);
    } catch (error) {
      console.error('Failed to save API key:', error);
      setKeyOpError(error instanceof ApiKeyStorageError ? error.message : 'Failed to save API key.');
    } finally {
      setIsKeyProcessing(false);
    }
  };

  const handleClearApiKey = async () => {
    if (!selectedProvider || !apiKeyService || !currentKeyDisplayInfo?.isStored) {
      return;
    }

    // Use asynchronous confirmation dialog
    const confirmed = await window.electronBridge.ui.confirm(
      `Are you sure you want to clear the API key for ${selectedProvider}? This action cannot be undone.`,
      'Confirm Clear API Key'
    );
    if (!confirmed) {
      return;
    }

    setIsKeyProcessing(true);
    setKeyOpError(null);

    try {
      await apiKeyService.deleteKey(selectedProvider);
      
      console.log(`API key for ${selectedProvider} successfully requested for deletion. Optimistically updating UI.`);
      
      // Immediate optimistic UI update for instant responsiveness
      // Use React.startTransition or batch updates to ensure immediate re-render
      setApiKeyInput(''); // Clear any stale text in the input
      setShowApiKey(false); // Reset password visibility toggle
      setCurrentKeyDisplayInfo({ isStored: false, lastFourChars: undefined }); // OPTIMISTIC UPDATE
      setIsKeyProcessing(false); // Release processing lock immediately for UI responsiveness
      
      // Refresh key display info for definitive backend confirmation (in background)
      // Don't block UI with this slow operation
      apiKeyService.getApiKeyDisplayInfo(selectedProvider)
        .then((refreshedInfo) => {
          setCurrentKeyDisplayInfo(refreshedInfo); // Update with definitive state
          console.log(`API key display info for ${selectedProvider} refreshed from backend.`);
        })
        .catch((refreshError) => {
          console.warn(`Failed to re-fetch API key display info for ${selectedProvider} after deletion. UI is using optimistic state. Error:`, refreshError);
          // The UI already reflects a cleared state. This error means backend confirmation failed.
          // We might set a subtle, non-blocking warning if necessary, but avoid re-disabling the field.
        });
      
      console.log(`API key cleared successfully for ${selectedProvider}`);
    } catch (error) {
      console.error('Failed to clear API key:', error);
      setKeyOpError(error instanceof ApiKeyStorageError ? error.message : 'Failed to clear API key.');
      setIsKeyProcessing(false);
    }
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

  return (
    <div className="bg-white border rounded-lg p-6 h-fit">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Application Settings
        </h2>
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
                <div className="text-red-800 font-medium">
                  Error with application settings
                </div>
                <div className="text-red-600 text-sm mt-1">
                  {applicationSaveError || applicationSettingsError}
                </div>
              </div>
            )}

            {/* API Key Management Section */}
            <div className="border-t pt-6">
              <div className="flex items-center space-x-2 mb-4">
                <h3 className="text-md font-medium text-gray-900">
                  API Key Management
                </h3>
                <div
                  className="relative group"
                  title="Manage API keys for different AI providers. Keys are stored securely using OS-level encryption."
                >
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                </div>
              </div>

              <div className="space-y-4">
                {/* Provider Selection and API Key Input - Horizontal Layout */}
                <div className="flex items-start space-x-4">
                  {/* Provider Selection Group */}
                  <div className="flex-1 space-y-2">
                    <label
                      htmlFor="apiProvider"
                      className="block text-sm font-medium text-gray-700"
                    >
                      API Provider
                    </label>
                    <select
                      id="apiProvider"
                      value={selectedProvider || ''}
                      onChange={handleProviderChange}
                      disabled={!apiKeyService || availableProviders.length === 0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    >
                      {availableProviders.length === 0 ? (
                        <option value="">No providers available</option>
                      ) : (
                        availableProviders.map((provider) => (
                          <option key={provider} value={provider}>
                            {provider.charAt(0).toUpperCase() + provider.slice(1)}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* API Key Input Group */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <label
                        htmlFor="apiKeyInput"
                        className="block text-sm font-medium text-gray-700"
                      >
                        API Key
                      </label>
                      {currentKeyDisplayInfo?.isStored && (
                        <div
                          className="relative group"
                          title="API key is securely stored for this provider"
                        >
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={toggleApiKeyVisibility}
                        disabled={isKeyInfoLoading || isKeyProcessing || (currentKeyDisplayInfo?.isStored === true)}
                        className="text-gray-400 hover:text-gray-600 disabled:text-gray-300"
                        title={showApiKey ? "Hide API key" : "Show API key"}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="apiKeyInput"
                        type={currentKeyDisplayInfo?.isStored ? "text" : (showApiKey ? "text" : "password")}
                        value={currentKeyDisplayInfo?.isStored 
                          ? `••••${currentKeyDisplayInfo.lastFourChars || 'XXXX'}`
                          : apiKeyInput
                        }
                        onChange={handleApiKeyInputChange}
                        placeholder={(() => {
                          if (!selectedProvider) {
                            return 'Select an API provider first';
                          }
                          
                          const providerNameForPlaceholder = selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1);
                          
                          if (isKeyInfoLoading) {
                            return `Loading key for ${providerNameForPlaceholder}...`;
                          } else if (currentKeyDisplayInfo?.isStored) {
                            return '';
                          } else if (currentKeyDisplayInfo && !currentKeyDisplayInfo.isStored) {
                            return `Enter ${providerNameForPlaceholder} API key`;
                          } else if (!currentKeyDisplayInfo && !keyOpError && selectedProvider) {
                            return `Enter ${providerNameForPlaceholder} API key`;
                          }
                          
                          return 'Enter API key';
                        })()}
                        disabled={isKeyInfoLoading || isKeyProcessing || (currentKeyDisplayInfo?.isStored === true)}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                          currentKeyDisplayInfo?.isStored ? 'text-gray-400' : ''
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* API Key Operation Error Display */}
                {keyOpError && !isKeyInfoLoading && (
                  <div className="text-red-600 text-sm mt-1">
                    {keyOpError}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleSaveApiKey}
                    disabled={
                      !selectedProvider ||
                      !apiKeyService ||
                      !apiKeyInput.trim() ||
                      isKeyProcessing ||
                      isKeyInfoLoading ||
                      !!currentKeyDisplayInfo?.isStored
                    }
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isKeyProcessing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Key
                  </button>

                  <button
                    onClick={handleClearApiKey}
                    disabled={
                      !selectedProvider ||
                      !apiKeyService ||
                      !currentKeyDisplayInfo?.isStored ||
                      isKeyProcessing ||
                      isKeyInfoLoading
                    }
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Key
                  </button>
                </div>
              </div>
            </div>

            {/* Application Settings Form */}
            <div className="border-t pt-6 space-y-6">
              {/* Experimental Features Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <label
                    htmlFor="enableExperimentalFeatures"
                    className="block text-sm font-medium text-gray-700"
                  >
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
                    disabled={
                      isLoadingApplicationSettings || isSavingApplication
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Smart Preview Lines Range */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Smart Preview Lines Range
                  </label>
                  <div
                    className="relative group"
                    title="Range of lines to show in smart preview mode. Min: 1-200, Max: 1-200 (must be >= min)."
                  >
                    <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <label
                      htmlFor="minSmartPreviewLines"
                      className="text-sm text-gray-600"
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
                      className="w-16 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                      disabled={
                        isLoadingApplicationSettings || isSavingApplication
                      }
                    />
                  </div>
                  <span className="text-gray-400">–</span>
                  <div className="flex items-center space-x-2">
                    <label
                      htmlFor="maxSmartPreviewLines"
                      className="text-sm text-gray-600"
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
                      className="w-16 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                      disabled={
                        isLoadingApplicationSettings || isSavingApplication
                      }
                    />
                  </div>
                  <span className="text-sm text-gray-500">lines</span>
                </div>
              </div>

              {/* Threshold Line Length */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label
                    htmlFor="thresholdLineLength"
                    className="block text-sm font-medium text-gray-700"
                  >
                    File Size Threshold
                  </label>
                  <div
                    className="relative group"
                    title="File size (number of lines) after which a file is considered large for warnings or special handling (50-2000). Default: 200."
                  >
                    <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
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
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    disabled={
                      isLoadingApplicationSettings || isSavingApplication
                    }
                  />
                  <span className="text-sm text-gray-500">lines</span>
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
  );
};

export default ApplicationSettingsPane;
