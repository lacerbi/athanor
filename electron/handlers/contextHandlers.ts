// AI Summary: Defines IPC handlers for context-related operations.
// Exposes the RelevanceEngineService to the renderer process for calculating prompt context.

import { ipcMain } from 'electron';
import { RelevanceEngineService } from '../services/RelevanceEngineService';

export function setupContextHandlers(relevanceEngine: RelevanceEngineService) {
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
        return await relevanceEngine.calculateContext(
          selectedFilePaths,
          taskDescription
        );
      } catch (error) {
        console.error('Error in ath:recalculate-context IPC handler:', error);
        // In case of an error, return a valid empty response to prevent renderer from breaking
        return { selected: selectedFilePaths, allNeighbors: [], promptNeighbors: [] };
      }
    }
  );
}
