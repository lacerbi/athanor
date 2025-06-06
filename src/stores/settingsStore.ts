// AI Summary: Zustand store for managing both project and application settings state.
// Provides actions to load/save settings via IPC, handles loading states and errors.
// Integrates with the main process SettingsService through window.settingsService.

import { create } from 'zustand';
import type { ProjectSettings, ApplicationSettings } from '../types/global';
import { SETTINGS } from '../utils/constants';

interface SettingsState {
  // Project settings state
  projectSettings: ProjectSettings | null;
  isLoadingProjectSettings: boolean;
  projectSettingsError: string | null;
  currentProjectPath: string | null;
  
  // Application settings state
  applicationSettings: ApplicationSettings | null;
  isLoadingApplicationSettings: boolean;
  applicationSettingsError: string | null;
  
  // Project settings actions
  loadProjectSettings: (projectPath: string | null) => Promise<void>;
  saveProjectSettings: (settings: ProjectSettings) => Promise<void>;
  
  // Application settings actions
  loadApplicationSettings: () => Promise<void>;
  saveApplicationSettings: (settings: ApplicationSettings) => Promise<void>;
  
  // Utility actions
  clearProjectSettings: () => void;
  resetErrors: () => void;
  updateLastOpenedProjectPath: (projectPath: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Initial state
  projectSettings: null,
  isLoadingProjectSettings: false,
  projectSettingsError: null,
  currentProjectPath: null,
  
  applicationSettings: null,
  isLoadingApplicationSettings: false,
  applicationSettingsError: null,
  
  // Project settings actions
  loadProjectSettings: async (projectPath: string | null) => {
    // Clear project settings if no path provided
    if (!projectPath) {
      set({
        projectSettings: null,
        currentProjectPath: null,
        projectSettingsError: null,
        isLoadingProjectSettings: false,
      });
      return;
    }
    
    // Don't reload if same project path
    if (get().currentProjectPath === projectPath && get().projectSettings !== null) {
      return;
    }
    
    set({ 
      isLoadingProjectSettings: true, 
      projectSettingsError: null,
      currentProjectPath: projectPath,
    });
    
    try {
      const settings = await window.settingsService.getProjectSettings(projectPath);
      set({ 
        projectSettings: settings,
        isLoadingProjectSettings: false,
      });
      console.log('Loaded project settings:', settings);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error loading project settings';
      set({ 
        projectSettingsError: errorMessage,
        isLoadingProjectSettings: false,
        projectSettings: null,
      });
      console.error('Error loading project settings:', error);
    }
  },
  
  saveProjectSettings: async (settings: ProjectSettings) => {
    const { currentProjectPath } = get();
    if (!currentProjectPath) {
      throw new Error('No project loaded - cannot save project settings');
    }
    
    set({ projectSettingsError: null });
    
    try {
      await window.settingsService.saveProjectSettings(currentProjectPath, settings);
      set({ projectSettings: settings });
      console.log('Saved project settings:', settings);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error saving project settings';
      set({ projectSettingsError: errorMessage });
      console.error('Error saving project settings:', error);
      throw error;
    }
  },
  
  // Application settings actions
  loadApplicationSettings: async () => {
    // Don't reload if already loaded and not in error state
    if (get().applicationSettings !== null && !get().applicationSettingsError) {
      return;
    }
    
    set({ 
      isLoadingApplicationSettings: true, 
      applicationSettingsError: null,
    });
    
    try {
      const settings = await window.settingsService.getApplicationSettings();
      // If no settings file exists, use defaults
      const applicationSettings = settings || { ...SETTINGS.defaults.application };
      set({ 
        applicationSettings,
        isLoadingApplicationSettings: false,
      });
      console.log('Loaded application settings:', applicationSettings);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error loading application settings';
      set({ 
        applicationSettingsError: errorMessage,
        isLoadingApplicationSettings: false,
        applicationSettings: null,
      });
      console.error('Error loading application settings:', error);
    }
  },
  
  saveApplicationSettings: async (settings: ApplicationSettings) => {
    set({ applicationSettingsError: null });
    
    try {
      await window.settingsService.saveApplicationSettings(settings);
      set({ applicationSettings: settings });
      console.log('Saved application settings:', settings);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error saving application settings';
      set({ applicationSettingsError: errorMessage });
      console.error('Error saving application settings:', error);
      throw error;
    }
  },
  
  // Utility actions
  clearProjectSettings: () => {
    set({
      projectSettings: null,
      currentProjectPath: null,
      projectSettingsError: null,
      isLoadingProjectSettings: false,
    });
  },
  
  resetErrors: () => {
    set({
      projectSettingsError: null,
      applicationSettingsError: null,
    });
  },
  
  // Update last opened project path
  updateLastOpenedProjectPath: async (projectPath: string) => {
    const { applicationSettings, saveApplicationSettings } = get();
    
    if (!applicationSettings) {
      throw new Error('Application settings not loaded');
    }
    
    const updatedSettings = {
      ...applicationSettings,
      lastOpenedProjectPath: projectPath,
    };
    
    await saveApplicationSettings(updatedSettings);
  },
}));
