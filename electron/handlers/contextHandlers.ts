// AI Summary: Defines IPC handlers for context-related operations.
// Exposes the RelevanceEngineService to the renderer process for calculating prompt context.

import { ipcMain } from 'electron';
import { RelevanceEngineService } from '../services/RelevanceEngineService';
import { SettingsService } from '../services/SettingsService';
import { SETTINGS } from '../../src/utils/constants';

export function setupContextHandlers(
  relevanceEngine: RelevanceEngineService,
  settingsService: SettingsService
) {
  ipcMain.handle(
    'ath:recalculate-context',
    async (
      _event,
      {
        selectedFilePaths,
        taskDescription,
      }: { selectedFilePaths: string[]; taskDescription?: string }
    ) => {
      try {
        // Fetch application settings to get the token limit
        const appSettings = await settingsService.getApplicationSettings();
        const maxTokens = appSettings?.maxSmartContextTokens ?? SETTINGS.defaults.application.maxSmartContextTokens;

        return await relevanceEngine.calculateContext(
          selectedFilePaths,
          taskDescription,
          { maxNeighborTokens: maxTokens }
        );
      } catch (error) {
        console.error('Error in ath:recalculate-context IPC handler:', error);
        // In case of an error, return a valid empty response to prevent renderer from breaking
        return { userSelected: selectedFilePaths, heuristicSeedFiles: [], allNeighbors: [], promptNeighbors: [] };
      }
    }
  );
}
