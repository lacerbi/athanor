// AI Summary: Dedicated component for secure API key management with provider selection,
// key storage/deletion, validation, and display functionality. Uses secure storage via IPC bridge.
// Updated for enhanced security - no longer has access to plaintext keys in renderer process.

import React, { useEffect, useState, useCallback } from 'react';
import {
  HelpCircle,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Check,
} from 'lucide-react';
import { ApiKeyServiceRenderer } from '../../electron/modules/secure-api-storage/renderer';
import type { ApiProvider } from '../../electron/modules/secure-api-storage/common';
import { ApiKeyStorageError } from '../../electron/modules/secure-api-storage/common';
import { getAllAthanorPresets } from '../services/athanorPresetService';

const ApiKeyManagementPane: React.FC = () => {
  // API Key Management state
  const [apiKeyService, setApiKeyService] =
    useState<ApiKeyServiceRenderer | null>(null);
  const [availableProviders, setAvailableProviders] = useState<ApiProvider[]>(
    []
  );
  const [areProvidersLoading, setAreProvidersLoading] = useState<boolean>(true);
  const [selectedProvider, setSelectedProvider] = useState<ApiProvider | null>(
    null
  );
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [currentKeyDisplayInfo, setCurrentKeyDisplayInfo] = useState<{
    isStored: boolean;
    lastFourChars?: string;
  } | null>(null);
  const [isKeyInfoLoading, setIsKeyInfoLoading] = useState<boolean>(false);
  const [keyOpError, setKeyOpError] = useState<string | null>(null);
  const [isKeyProcessing, setIsKeyProcessing] = useState<boolean>(false);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [providersWithKeys, setProvidersWithKeys] = useState<Set<ApiProvider>>(
    new Set()
  );

  // Initialize API Key Service
  useEffect(() => {
    try {
      const service = new ApiKeyServiceRenderer();
      setApiKeyService(service);
      console.log('ApiKeyServiceRenderer initialized successfully with secure API operations');
    } catch (error) {
      console.error('Failed to initialize ApiKeyServiceRenderer:', error);
      setKeyOpError(
        'Failed to initialize API key service. Please restart the application.'
      );
    }
  }, []);

  // Function to check which providers have stored keys
  const loadProvidersWithKeys = useCallback(
    async (providers: ApiProvider[]) => {
      if (!apiKeyService) return;

      try {
        const providersWithStoredKeys = new Set<ApiProvider>();

        // Check each provider for stored keys
        await Promise.all(
          providers.map(async (provider) => {
            try {
              const keyInfo =
                await apiKeyService.getApiKeyDisplayInfo(provider);
              if (keyInfo.isStored) {
                providersWithStoredKeys.add(provider);
              }
            } catch (error) {
              console.warn(
                `Failed to check key for provider ${provider}:`,
                error
              );
            }
          })
        );

        setProvidersWithKeys(providersWithStoredKeys);
      } catch (error) {
        console.error('Failed to load providers with keys:', error);
      }
    },
    [apiKeyService]
  );

  // Load available providers when service is ready
  useEffect(() => {
    if (apiKeyService) {
      setAreProvidersLoading(true);
      setAvailableProviders([]);
      setProvidersWithKeys(new Set());
      setKeyOpError(null);

      // Fetch Athanor presets and filter providers
      getAllAthanorPresets()
        .then((presets) => {
          // Extract unique provider IDs from presets
          const presetProviderIdSet = new Set<string>(
            presets.map(preset => preset.providerId)
          );

          // Get providers supported by API key service
          const actualServiceProviders = apiKeyService.getAvailableProviders();

          // Compute intersection: providers in presets AND supported by service
          const newAvailableProviders = actualServiceProviders.filter(
            provider => presetProviderIdSet.has(provider)
          );

          setAvailableProviders(newAvailableProviders);

          // Update selected provider
          if (newAvailableProviders.length > 0) {
            if (!selectedProvider || !newAvailableProviders.includes(selectedProvider)) {
              setSelectedProvider(newAvailableProviders[0]);
            }
          } else {
            setSelectedProvider(null);
          }

          // Load which providers have stored keys
          loadProvidersWithKeys(newAvailableProviders);
        })
        .catch((error) => {
          console.error('Failed to load Athanor presets for provider filtering:', error);
          setKeyOpError('Failed to load API providers from preset configuration.');
          setAvailableProviders([]);
          setSelectedProvider(null);
          setProvidersWithKeys(new Set());
        })
        .finally(() => {
          setAreProvidersLoading(false);
        });
    } else {
      setAvailableProviders([]);
      setSelectedProvider(null);
      setProvidersWithKeys(new Set());
      setAreProvidersLoading(false);
    }
  }, [apiKeyService, loadProvidersWithKeys]);

  // Fetch key display info when selected provider changes
  useEffect(() => {
    if (selectedProvider && apiKeyService) {
      setIsKeyInfoLoading(true);
      setKeyOpError(null);
      setApiKeyInput(''); // Clear input when switching providers
      setShowApiKey(false); // Reset visibility when switching providers

      apiKeyService
        .getApiKeyDisplayInfo(selectedProvider)
        .then((info) => {
          setCurrentKeyDisplayInfo(info);
        })
        .catch((error) => {
          console.error('Failed to get key display info:', error);
          setKeyOpError(
            error instanceof ApiKeyStorageError
              ? error.message
              : 'Failed to get key information.'
          );
          setCurrentKeyDisplayInfo(null);
        })
        .finally(() => {
          setIsKeyInfoLoading(false);
        });
    }
  }, [selectedProvider, apiKeyService]);

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
    if (
      !selectedProvider ||
      !apiKeyService ||
      !apiKeyInput.trim() ||
      currentKeyDisplayInfo?.isStored
    ) {
      return;
    }

    // Client-side validation
    if (
      !apiKeyService.validateApiKeyFormat(selectedProvider, apiKeyInput.trim())
    ) {
      setKeyOpError(
        `Invalid API key format for ${selectedProvider}. Please check your key and try again.`
      );
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
      const updatedInfo =
        await apiKeyService.getApiKeyDisplayInfo(selectedProvider);
      setCurrentKeyDisplayInfo(updatedInfo);

      // Update providers with keys state
      if (updatedInfo.isStored) {
        setProvidersWithKeys((prev) => new Set(prev).add(selectedProvider));
      }

      console.log(`API key saved successfully for ${selectedProvider}`);
    } catch (error) {
      console.error('Failed to save API key:', error);
      setKeyOpError(
        error instanceof ApiKeyStorageError
          ? error.message
          : 'Failed to save API key.'
      );
    } finally {
      setIsKeyProcessing(false);
    }
  };

  const handleClearApiKey = async () => {
    if (
      !selectedProvider ||
      !apiKeyService ||
      !currentKeyDisplayInfo?.isStored
    ) {
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

      console.log(
        `API key for ${selectedProvider} successfully requested for deletion. Optimistically updating UI.`
      );

      // Immediate optimistic UI update for instant responsiveness
      // Use React.startTransition or batch updates to ensure immediate re-render
      setApiKeyInput(''); // Clear any stale text in the input
      setShowApiKey(false); // Reset password visibility toggle
      setCurrentKeyDisplayInfo({ isStored: false, lastFourChars: undefined }); // OPTIMISTIC UPDATE
      setProvidersWithKeys((prev) => {
        const newSet = new Set(prev);
        newSet.delete(selectedProvider);
        return newSet;
      }); // Update providers with keys state
      setIsKeyProcessing(false); // Release processing lock immediately for UI responsiveness

      // Refresh key display info for definitive backend confirmation (in background)
      // Don't block UI with this slow operation
      apiKeyService
        .getApiKeyDisplayInfo(selectedProvider)
        .then((refreshedInfo) => {
          setCurrentKeyDisplayInfo(refreshedInfo); // Update with definitive state
          console.log(
            `API key display info for ${selectedProvider} refreshed from backend.`
          );
        })
        .catch((refreshError) => {
          console.warn(
            `Failed to re-fetch API key display info for ${selectedProvider} after deletion. UI is using optimistic state. Error:`,
            refreshError
          );
          // The UI already reflects a cleared state. This error means backend confirmation failed.
          // We might set a subtle, non-blocking warning if necessary, but avoid re-disabling the field.
        });

      console.log(`API key cleared successfully for ${selectedProvider}`);
    } catch (error) {
      console.error('Failed to clear API key:', error);
      setKeyOpError(
        error instanceof ApiKeyStorageError
          ? error.message
          : 'Failed to clear API key.'
      );
      setIsKeyProcessing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 h-fit">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            API Key Management
          </h2>
          <div
            className="relative group"
            title="Manage API keys for different AI providers. Keys are stored securely using OS-level encryption."
          >
            <HelpCircle className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" />
          </div>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">Global</span>
      </div>

      <div className="space-y-6">

        <div className="space-y-4">
          {/* Provider Selection and API Key Input - Horizontal Layout */}
          <div className="flex items-start space-x-4">
            {/* Provider Selection Group */}
            <div className="flex-1 space-y-2">
              <label
                htmlFor="apiProvider"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                API Provider
              </label>
              <select
                id="apiProvider"
                value={selectedProvider || ''}
                onChange={handleProviderChange}
                disabled={
                  !apiKeyService || areProvidersLoading || availableProviders.length === 0
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 disabled:bg-gray-50 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400"
              >
                {areProvidersLoading ? (
                  <option value="">Loading providers...</option>
                ) : availableProviders.length === 0 ? (
                  <option value="">No providers available</option>
                ) : (
                  availableProviders.map((provider) => (
                    <option key={provider} value={provider}>
                      {providersWithKeys.has(provider)
                        ? `${provider.charAt(0).toUpperCase() + provider.slice(1)} ✓`
                        : provider.charAt(0).toUpperCase() +
                          provider.slice(1)}
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
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  API Key
                </label>
                {currentKeyDisplayInfo?.isStored && (
                  <div
                    className="relative group"
                    title="API key is securely stored for this provider"
                  >
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={toggleApiKeyVisibility}
                  disabled={isKeyInfoLoading || isKeyProcessing}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:text-gray-300 dark:disabled:text-gray-600"
                  title={showApiKey ? 'Hide API key' : 'Show API key'}
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
                  type={(() => {
                    if (currentKeyDisplayInfo?.isStored) {
                      return 'text';
                    }
                    return showApiKey ? 'text' : 'password';
                  })()}
                  value={(() => {
                    if (currentKeyDisplayInfo?.isStored) {
                      return showApiKey
                        ? `••••${currentKeyDisplayInfo.lastFourChars || 'XXXX'}`
                        : '••••••••';
                    }
                    return apiKeyInput;
                  })()}
                  onChange={handleApiKeyInputChange}
                  placeholder={(() => {
                    if (areProvidersLoading) {
                      return 'Loading providers...';
                    }

                    if (!selectedProvider) {
                      return 'Select an API provider first';
                    }

                    const providerNameForPlaceholder =
                      selectedProvider.charAt(0).toUpperCase() +
                      selectedProvider.slice(1);

                    if (isKeyInfoLoading) {
                      return `Loading key for ${providerNameForPlaceholder}...`;
                    } else if (currentKeyDisplayInfo?.isStored) {
                      return '';
                    } else if (
                      currentKeyDisplayInfo &&
                      !currentKeyDisplayInfo.isStored
                    ) {
                      return `Enter ${providerNameForPlaceholder} API key`;
                    } else if (
                      !currentKeyDisplayInfo &&
                      !keyOpError &&
                      selectedProvider
                    ) {
                      return `Enter ${providerNameForPlaceholder} API key`;
                    }

                    return 'Enter API key';
                  })()}
                  disabled={
                    areProvidersLoading ||
                    isKeyInfoLoading ||
                    isKeyProcessing ||
                    currentKeyDisplayInfo?.isStored === true
                  }
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 disabled:bg-gray-50 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400 ${
                    currentKeyDisplayInfo?.isStored ? 'text-gray-400 dark:text-gray-500' : ''
                  }`}
                />
              </div>
            </div>
          </div>

          {/* API Key Operation Error Display */}
          {keyOpError && !isKeyInfoLoading && (
            <div className="text-red-600 dark:text-red-400 text-sm mt-1">{keyOpError}</div>
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
              className="flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="flex items-center px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyManagementPane;
