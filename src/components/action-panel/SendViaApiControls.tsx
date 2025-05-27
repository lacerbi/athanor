// AI Summary: Component for managing "Send via API" functionality including LLM preset selection,
// API key validation, and sending prompts to LLM services with response processing.
import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import type { AthanorModelPreset } from '../../types/athanorPresets';
import type { ApplicationSettings, LogEntry } from '../../types/global';
import { getAllAthanorPresets } from '../../services/athanorPresetService';
import { processAiResponseContent } from '../../actions/ApplyAiOutputAction';
import { useApplyChangesStore } from '../../stores/applyChangesStore';

interface SendViaApiControlsProps {
  isActive: boolean;
  outputContent: string;
  applicationSettings: ApplicationSettings | null;
  saveApplicationSettings: (settings: ApplicationSettings) => Promise<void>;
  addLog: (message: string | Omit<LogEntry, 'id' | 'timestamp'>) => void;
  setActivePanelTab?: (tab: 'workbench' | 'viewer' | 'apply-changes') => void;
  setParentIsLoading: (loading: boolean) => void;
  isSendingRequest: boolean;
  setStoreIsGeneratingPrompt: (loading: boolean) => void;
}

const SendViaApiControls: React.FC<SendViaApiControlsProps> = ({
  isActive,
  outputContent,
  applicationSettings,
  saveApplicationSettings,
  addLog,
  setActivePanelTab,
  setParentIsLoading,
  isSendingRequest,
  setStoreIsGeneratingPrompt,
}) => {
  // State for LLM preset selection
  const [availablePresets, setAvailablePresets] = useState<AthanorModelPreset[]>([]);
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);

  // Fetch and filter presets based on stored API keys
  useEffect(() => {
    const fetchAndFilterPresets = async () => {
      if (!isActive) return; // Only fetch when panel is active

      setIsLoadingPresets(true);
      try {
        const allPresets = await getAllAthanorPresets();
        const filtered: AthanorModelPreset[] = [];

        for (const preset of allPresets) {
          // Check if API key is stored for the provider
          if (window.electronBridge?.secureApiKeyManager) {
            const isStored =
              await window.electronBridge.secureApiKeyManager.isKeyStored(
                preset.providerId
              );
            if (isStored) {
              filtered.push(preset);
            }
          }
        }

        setAvailablePresets(filtered);

        // Note: Invalid preset validation is handled by useEffect below
      } catch (error) {
        console.error('Error fetching or filtering presets:', error);
        addLog(
          `Error loading LLM presets for API sending: ${error instanceof Error ? error.message : String(error)}`
        );
        setAvailablePresets([]);
      } finally {
        setIsLoadingPresets(false);
      }
    };

    void fetchAndFilterPresets();
  }, [isActive, addLog]);

  // Handle preset selection change
  const handlePresetDropdownChange = async (newPresetId: string) => {
    if (applicationSettings) {
      const updatedSettings: ApplicationSettings = {
        ...applicationSettings,
        lastSelectedApiPresetId: newPresetId || null, // Store null if selection is cleared
      };
      try {
        await saveApplicationSettings(updatedSettings);
        addLog(`Preferred API model selection saved: ${newPresetId || 'None'}.`);
      } catch (error) {
        addLog(`Failed to save preferred API model: ${error instanceof Error ? error.message : String(error)}.`);
      }
    }
  };

  // Validate persisted preset ID and clear if invalid
  useEffect(() => {
    if (applicationSettings && applicationSettings.lastSelectedApiPresetId && availablePresets.length > 0 && !isLoadingPresets) {
      const persistedId = applicationSettings.lastSelectedApiPresetId;
      const isValid = availablePresets.some(p => p.id === persistedId);

      if (!isValid) {
        addLog(`Persisted API model ID "${persistedId}" is no longer valid. Clearing from settings.`);
        const updatedSettings = { ...applicationSettings, lastSelectedApiPresetId: null };
        saveApplicationSettings(updatedSettings)
          .catch(error => addLog(`Error clearing invalid persisted API model ID: ${error instanceof Error ? error.message : String(error)}`));
      }
    }
  }, [applicationSettings, availablePresets, isLoadingPresets, saveApplicationSettings, addLog]);

  // Handler for Send via API button
  const handleSendViaApi = async () => {
    const selectedPresetId = applicationSettings?.lastSelectedApiPresetId;
    if (!selectedPresetId || outputContent.trim() === '') {
      addLog('Cannot send: No model selected or prompt is empty.');
      return;
    }

    const preset = availablePresets.find((p) => p.id === selectedPresetId);
    if (!preset) {
      addLog(`Error: Selected preset with ID ${selectedPresetId} not found.`);
      return;
    }

    // Check if LLM service bridge is available
    if (!window.electronBridge?.llmService) {
      addLog('Error: LLM Service bridge not available.');
      return;
    }

    setParentIsLoading(true);
    setStoreIsGeneratingPrompt(true);

    try {
      // Define system and user messages
      const systemMessageContent = "You are a helpful AI assistant. Follow the provided instructions carefully.";
      const userMessageContent = outputContent;

      // Double-check that user message is not empty
      if (userMessageContent.trim() === '') {
        addLog('Cannot send: Generated prompt is empty.');
        return;
      }

      // Construct messages for LLM request
      const messages = [
        { role: 'system' as const, content: systemMessageContent },
        { role: 'user' as const, content: userMessageContent },
      ];

      // Construct the LLM request
      const request = {
        providerId: preset.providerId,
        modelId: preset.modelId,
        messages: messages,
        settings: preset.settings,
      };

      addLog(`Sending prompt to ${preset.displayName} via API...`);

      // Send the request via electron bridge
      const response =
        await window.electronBridge.llmService.sendMessage(request);

      // Process the response
      if (response.object === 'chat.completion') {
        if (response.choices && response.choices.length > 0) {
          const aiContent = response.choices[0].message.content;
          
          // Debug: Log the full LLM response to console
          console.log('LLM Response Content:', aiContent);
          
          if (aiContent && aiContent.trim() !== '') {
            addLog('Received response from LLM. Attempting to process commands...');
            
            // Get necessary functions for processAiResponseContent
            const { setOperations, clearOperations } = useApplyChangesStore.getState();
            
            // Process the AI response for commands
            await processAiResponseContent(aiContent, {
              addLog,
              setOperations,
              clearOperations,
              setActiveTab: setActivePanelTab
            });
          } else {
            addLog('LLM Response: Received empty content.');
          }
        } else {
          addLog('LLM Response: No choices returned in response.');
        }
      } else if (response.object === 'error') {
        addLog(
          `LLM Error: ${response.error.message} (Code: ${response.error.code || 'N/A'}, Type: ${response.error.type || 'N/A'})`
        );
      } else {
        addLog(`Unexpected response format: ${JSON.stringify(response)}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      addLog(`Error during LLM request: ${errorMessage}`);
    } finally {
      setStoreIsGeneratingPrompt(false);
      setParentIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <button
        onClick={handleSendViaApi}
        className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={
          isLoadingPresets ||
          isSendingRequest ||
          !applicationSettings?.lastSelectedApiPresetId ||
          outputContent.trim() === ''
        }
        title={
          isSendingRequest
            ? 'Sending request...'
            : !applicationSettings?.lastSelectedApiPresetId
            ? 'Select a model first'
            : outputContent.trim() === ''
              ? 'Generate a prompt first'
              : 'Send prompt via API'
        }
      >
        Send via API
      </button>

      <select
        value={applicationSettings?.lastSelectedApiPresetId || ''}
        onChange={(e) => handlePresetDropdownChange(e.target.value)}
        className="px-2 py-1.5 text-sm border rounded disabled:opacity-50 bg-white max-w-[240px] truncate"
        disabled={isLoadingPresets || availablePresets.length === 0}
      >
        <option value="">
          {isLoadingPresets ? 'Loading...' : 'Select Model...'}
        </option>
        {availablePresets.map((preset) => (
          <option key={preset.id} value={preset.id} className="truncate">
            {preset.displayName}
          </option>
        ))}
      </select>

      <div className="relative group">
        <Info size={18} className="text-gray-500 cursor-help" />
        <div className="absolute bottom-full mb-2 right-0 px-3 py-2 text-xs text-white bg-gray-800 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-normal pointer-events-none w-64 z-10">
          Directly sends the generated prompt to a LLM via API, intended
          for simple calls (e.g., Autoselect prompts). Athanor's standard
          workflow is to paste prompts into external chat interfaces, copy
          the output, and apply it via the Apply AI Output button.
        </div>
      </div>
    </div>
  );
};

export default SendViaApiControls;
