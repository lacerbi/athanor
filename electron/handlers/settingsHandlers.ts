// AI Summary: IPC handlers for settings operations including project and application settings.
// Provides secure interface between renderer and main process for settings management.

import { ipcMain } from 'electron';
import type { SettingsService } from '../services/SettingsService';
import type { ProjectSettings, ApplicationSettings } from '../../src/types/global';

/**
 * Set up IPC handlers for settings operations
 * @param settingsService SettingsService instance
 */
export function setupSettingsHandlers(settingsService: SettingsService) {
  // Project settings handlers
  ipcMain.handle('settings:get-project', async (event, projectPath: string): Promise<ProjectSettings | null> => {
    try {
      return await settingsService.getProjectSettings(projectPath);
    } catch (error) {
      console.error('IPC error getting project settings:', error);
      return null;
    }
  });

  ipcMain.handle('settings:save-project', async (event, projectPath: string, settings: ProjectSettings): Promise<void> => {
    try {
      await settingsService.saveProjectSettings(projectPath, settings);
    } catch (error) {
      console.error('IPC error saving project settings:', error);
      throw error;
    }
  });

  // Application settings handlers
  ipcMain.handle('settings:get-application', async (event): Promise<ApplicationSettings | null> => {
    try {
      return await settingsService.getApplicationSettings();
    } catch (error) {
      console.error('IPC error getting application settings:', error);
      return null;
    }
  });

  ipcMain.handle('settings:save-application', async (event, settings: ApplicationSettings): Promise<void> => {
    try {
      await settingsService.saveApplicationSettings(settings);
    } catch (error) {
      console.error('IPC error saving application settings:', error);
      throw error;
    }
  });

  console.log('Settings IPC handlers registered');
}
