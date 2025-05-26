// AI Summary: Service for loading and managing Athanor model presets, filtering against available providers/models,
// with caching and validation. Integrates with LLM service via Electron bridge and provides logging.
import type { AthanorModelPreset } from '../types/athanorPresets';
import { useLogStore } from '../stores/logStore';

// Import JSON data using require to avoid TypeScript module resolution issues
const athanorModelPresetsData = require('../config/athanorModelPresets.json');
const rawPresets: AthanorModelPreset[] = athanorModelPresetsData as AthanorModelPreset[];

// Module-level cache and initialization tracking
let filteredPresetsCache: AthanorModelPreset[] | null = null;
let initializationPromise: Promise<void> | null = null;

/**
 * Performs the actual initialization of presets by validating against available providers and models
 */
async function performInitialization(): Promise<void> {
  const { addLog } = useLogStore.getState();

  // Check if the LLM service bridge is available
  if (!window.electronBridge || !window.electronBridge.llmService) {
    addLog("Error: LLM Service bridge not available. Cannot initialize Athanor model presets.");
    filteredPresetsCache = [];
    return;
  }

  try {
    addLog("Initializing Athanor model presets...");

    // Fetch available providers and their models
    const availableProviders = await window.electronBridge.llmService.getProviders();
    const validProviderIds = new Set(availableProviders.map(p => p.id));
    const validModelMap = new Map<string, Set<string>>();

    // Build a map of provider -> valid models
    for (const provider of availableProviders) {
      try {
        const models = await window.electronBridge.llmService.getModels(provider.id);
        validModelMap.set(provider.id, new Set(models.map(m => m.id)));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        addLog(`Warning: Failed to fetch models for provider "${provider.id}": ${message}`);
        validModelMap.set(provider.id, new Set()); // Set empty set for this provider
      }
    }

    // Filter presets against available providers and models
    filteredPresetsCache = rawPresets.filter(preset => {
      // Validate basic structure
      if (!preset.id || !preset.displayName || !preset.providerId || !preset.modelId) {
        addLog(`Warning: Athanor preset with incomplete data structure will be excluded. ID: ${preset.id || 'unknown'}`);
        return false;
      }

      // Check if provider is available
      if (!validProviderIds.has(preset.providerId)) {
        addLog(`Warning: Athanor preset "${preset.displayName}" (ID: ${preset.id}) references an unavailable provider "${preset.providerId}". It will be excluded.`);
        return false;
      }

      // Check if model is available for this provider
      const providerModels = validModelMap.get(preset.providerId);
      if (!providerModels || !providerModels.has(preset.modelId)) {
        addLog(`Warning: Athanor preset "${preset.displayName}" (ID: ${preset.id}) references an unavailable model "${preset.modelId}" for provider "${preset.providerId}". It will be excluded.`);
        return false;
      }

      // Validate settings structure
      if (preset.settings && typeof preset.settings !== 'object') {
        addLog(`Warning: Athanor preset "${preset.displayName}" (ID: ${preset.id}) has invalid 'settings' format. It will be excluded.`);
        return false;
      }

      // Additional validation for specific settings
      if (preset.settings) {
        // Validate temperature
        if (preset.settings.temperature !== undefined && 
            (typeof preset.settings.temperature !== 'number' || 
             preset.settings.temperature < 0 || 
             preset.settings.temperature > 2)) {
          addLog(`Warning: Athanor preset "${preset.displayName}" (ID: ${preset.id}) has invalid temperature value. It will be excluded.`);
          return false;
        }

        // Validate maxTokens
        if (preset.settings.maxTokens !== undefined && 
            (!Number.isInteger(preset.settings.maxTokens) || 
             preset.settings.maxTokens < 1 || 
             preset.settings.maxTokens > 100000)) {
          addLog(`Warning: Athanor preset "${preset.displayName}" (ID: ${preset.id}) has invalid maxTokens value. It will be excluded.`);
          return false;
        }

        // Validate topP
        if (preset.settings.topP !== undefined && 
            (typeof preset.settings.topP !== 'number' || 
             preset.settings.topP < 0 || 
             preset.settings.topP > 1)) {
          addLog(`Warning: Athanor preset "${preset.displayName}" (ID: ${preset.id}) has invalid topP value. It will be excluded.`);
          return false;
        }

        // Validate Gemini safety settings if present
        if (preset.settings.geminiSafetySettings && 
            !Array.isArray(preset.settings.geminiSafetySettings)) {
          addLog(`Warning: Athanor preset "${preset.displayName}" (ID: ${preset.id}) has invalid geminiSafetySettings format. It will be excluded.`);
          return false;
        }
      }

      return true;
    });

    const totalCount = rawPresets.length;
    const validCount = filteredPresetsCache.length;
    const excludedCount = totalCount - validCount;

    addLog(`Athanor model presets initialized. ${validCount} presets available${excludedCount > 0 ? ` (${excludedCount} excluded due to validation issues)` : ''}.`);

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addLog(`Error initializing Athanor model presets: ${message}`);
    filteredPresetsCache = []; // Set to empty on error
  }
}

/**
 * Ensures that the preset service is initialized before use
 */
function ensureInitialized(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = performInitialization();
  }
  return initializationPromise;
}

/**
 * Gets all available Athanor model presets
 * @returns Promise resolving to array of valid presets
 */
export async function getAllAthanorPresets(): Promise<AthanorModelPreset[]> {
  await ensureInitialized();
  return [...(filteredPresetsCache || [])]; // Return a copy to prevent external modification
}

/**
 * Gets a specific Athanor model preset by ID
 * @param id - The preset ID to look up
 * @returns Promise resolving to the preset or undefined if not found
 */
export async function getAthanorPresetById(id: string): Promise<AthanorModelPreset | undefined> {
  await ensureInitialized();
  return filteredPresetsCache?.find(p => p.id === id);
}

/**
 * Gets all presets for a specific provider
 * @param providerId - The provider ID to filter by
 * @returns Promise resolving to array of presets for the provider
 */
export async function getAthanorPresetsByProvider(providerId: string): Promise<AthanorModelPreset[]> {
  await ensureInitialized();
  return (filteredPresetsCache || []).filter(p => p.providerId === providerId);
}

/**
 * Gets all presets for a specific model
 * @param providerId - The provider ID
 * @param modelId - The model ID to filter by
 * @returns Promise resolving to array of presets for the model
 */
export async function getAthanorPresetsByModel(providerId: string, modelId: string): Promise<AthanorModelPreset[]> {
  await ensureInitialized();
  return (filteredPresetsCache || []).filter(p => p.providerId === providerId && p.modelId === modelId);
}

/**
 * Checks if presets are currently being initialized
 * @returns True if initialization is in progress
 */
export function isInitializing(): boolean {
  return initializationPromise !== null && filteredPresetsCache === null;
}

/**
 * Checks if presets have been initialized
 * @returns True if initialization has completed (successfully or with errors)
 */
export function isInitialized(): boolean {
  return filteredPresetsCache !== null;
}

/**
 * Forces re-initialization of the preset service
 * This is useful when the available providers/models might have changed
 * @returns Promise that resolves when re-initialization is complete
 */
export async function reinitializeAthanorModelPresetService(): Promise<void> {
  // Reset the cache and initialization state
  filteredPresetsCache = null;
  initializationPromise = null;
  
  // Perform fresh initialization
  await ensureInitialized();
}

/**
 * Explicitly initializes the Athanor model preset service
 * This can be called during application startup to trigger loading
 * @returns Promise that resolves when initialization is complete
 */
export async function initializeAthanorModelPresetService(): Promise<void> {
  await ensureInitialized();
}

/**
 * Gets statistics about the preset service
 * @returns Object containing initialization status and preset counts
 */
export async function getAthanorPresetServiceStats(): Promise<{
  isInitialized: boolean;
  isInitializing: boolean;
  totalRawPresets: number;
  validPresets: number;
  excludedPresets: number;
}> {
  await ensureInitialized();
  
  const validCount = filteredPresetsCache?.length || 0;
  const totalCount = rawPresets.length;
  
  return {
    isInitialized: isInitialized(),
    isInitializing: isInitializing(),
    totalRawPresets: totalCount,
    validPresets: validCount,
    excludedPresets: totalCount - validCount
  };
}
