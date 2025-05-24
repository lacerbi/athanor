// AI Summary: Manages reading and writing of settings JSON files for both project and application settings.
// Handles project settings in .ath_materials directory and application settings in user data directory.
// Provides error handling and fallbacks for missing or corrupt settings files.

import { app } from 'electron';
import type { ProjectSettings, ApplicationSettings } from '../../src/types/global';
import { FileService } from './FileService';
import { SETTINGS } from '../../src/utils/constants';

/**
 * SettingsService handles reading and writing settings JSON files.
 * It manages both project-specific settings (stored in .ath_materials)
 * and application-wide settings (stored in user data directory).
 */
export class SettingsService {
  private fileService: FileService;

  constructor(fileService: FileService) {
    this.fileService = fileService;
  }

  /**
   * Get project settings from project_settings.json in .ath_materials
   * @param projectPath Absolute path to the project directory
   * @returns ProjectSettings object or null if file doesn't exist/invalid
   */
  async getProjectSettings(projectPath: string): Promise<ProjectSettings | null> {
    try {
      // Construct path to project_settings.json in .ath_materials
      const materialsDir = this.fileService.join(projectPath, '.ath_materials');
      const settingsPath = this.fileService.join(materialsDir, SETTINGS.PROJECT_SETTINGS_FILENAME);
      
      // Check if file exists
      if (!(await this.fileService.exists(this.fileService.relativize(settingsPath)))) {
        console.log(`Project settings file not found: ${settingsPath}`);
        return null;
      }
      
      // Read and parse the file
      const content = await this.fileService.read(this.fileService.relativize(settingsPath), { encoding: 'utf8' });
      const settings = JSON.parse(content as string) as ProjectSettings;
      
      console.log(`Loaded project settings from: ${settingsPath}`);
      return settings;
    } catch (error) {
      console.error(`Error reading project settings for ${projectPath}:`, error);
      return null;
    }
  }

  /**
   * Save project settings to project_settings.json in .ath_materials
   * @param projectPath Absolute path to the project directory
   * @param settings ProjectSettings to save
   */
  async saveProjectSettings(projectPath: string, settings: ProjectSettings): Promise<void> {
    try {
      // Construct paths
      const materialsDir = this.fileService.join(projectPath, '.ath_materials');
      const settingsPath = this.fileService.join(materialsDir, SETTINGS.PROJECT_SETTINGS_FILENAME);
      
      // Ensure .ath_materials directory exists
      await this.fileService.ensureDir(this.fileService.relativize(materialsDir));
      
      // Write settings to file
      const content = JSON.stringify(settings, null, 2);
      await this.fileService.write(this.fileService.relativize(settingsPath), content);
      
      console.log(`Saved project settings to: ${settingsPath}`);
    } catch (error) {
      console.error(`Error saving project settings for ${projectPath}:`, error);
      throw error;
    }
  }

  /**
   * Get application settings from application_settings.json in user data directory
   * @returns ApplicationSettings object or null if file doesn't exist/invalid
   */
  async getApplicationSettings(): Promise<ApplicationSettings | null> {
    try {
      // Get user data directory
      const userDataPath = app.getPath('userData');
      const settingsPath = this.fileService.join(userDataPath, SETTINGS.APP_SETTINGS_FILENAME);
      
      // Convert to platform-specific path for direct file access
      const platformPath = this.fileService.toOS(settingsPath);
      
      // Check if file exists using direct fs access since it's outside project
      if (!(await this.fileService.exists(settingsPath))) {
        console.log(`Application settings file not found: ${settingsPath}`);
        return null;
      }
      
      // Read and parse the file using direct path
      const content = await this.fileService.read(settingsPath, { encoding: 'utf8' });
      const settings = JSON.parse(content as string) as ApplicationSettings;
      
      console.log(`Loaded application settings from: ${settingsPath}`);
      return settings;
    } catch (error) {
      console.error('Error reading application settings:', error);
      return null;
    }
  }

  /**
   * Save application settings to application_settings.json in user data directory
   * @param settings ApplicationSettings to save
   */
  async saveApplicationSettings(settings: ApplicationSettings): Promise<void> {
    try {
      // Get user data directory
      const userDataPath = app.getPath('userData');
      const settingsPath = this.fileService.join(userDataPath, SETTINGS.APP_SETTINGS_FILENAME);
      
      // Write settings to file using absolute path
      const content = JSON.stringify(settings, null, 2);
      await this.fileService.write(settingsPath, content);
      
      console.log(`Saved application settings to: ${settingsPath}`);
    } catch (error) {
      console.error('Error saving application settings:', error);
      throw error;
    }
  }
}
