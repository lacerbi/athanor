// AI Summary: Handles reading Athanor configuration with settings integration.
// Implements proper precedence for project information: ProjectSettings -> automatic discovery.
// Provides fallback values (e.g., project name from base directory name) and handles project name and project info file overrides from project settings.

import { AthanorConfig, ProjectSettings } from '../types/global';
import { getBaseName } from './fileTree';
import { readProjectInfo, readProjectInfoFromPath, normalizeContent } from './projectInfoUtils';

// Get fallback config values based on the base directory
export function getFallbackConfig(basePath: string): AthanorConfig {
  return {
    project_name: getBaseName(basePath),
    project_info: '',
    project_info_path: undefined,
  };
}

/**
 * Reads Athanor configuration, determining project name and project information.
 *
 * Project Name Precedence:
 * 1. `projectNameOverride` from `projectSettings` (if provided).
 * 2. Fallback: Name of the base project directory.
 *
 * Project Information (content and path) Precedence:
 * 1. `projectInfoFilePath` from `projectSettings` (if provided and file exists).
 * 2. Auto-discovery: Looks for standard files like `project.md`, `README.md` in the project root.
 * 3. Fallback: Empty string for `project_info` content, `undefined` for `project_info_path`.
 * * @param basePath The root path of the project.
 * @param projectSettings Optional project settings, typically from `project_settings.json`.
 * @returns The resolved `AthanorConfig` object.
 */
export async function readAthanorConfig(
  basePath: string,
  projectSettings?: ProjectSettings | null
): Promise<AthanorConfig> {
  try {
    // Start with fallback values
    const fallbackConfig = getFallbackConfig(basePath);
    let config = { ...fallbackConfig };
    
    // Apply project name from settings (highest priority for project_name)
    if (projectSettings?.projectNameOverride?.trim()) {
      config.project_name = projectSettings.projectNameOverride.trim();
      console.log('Applied project name override from settings:', config.project_name);
    }
    
    // Handle project info with settings precedence
    let projectInfoHandledBySettings = false;
    
    // First priority: ProjectSettings.projectInfoFilePath
    if (projectSettings?.projectInfoFilePath?.trim()) {
      try {
        const projectInfoResult = await readProjectInfoFromPath(
          basePath, 
          projectSettings.projectInfoFilePath.trim()
        );
        
        if (projectInfoResult !== null) {
          config.project_info = projectInfoResult.content;
          config.project_info_path = projectInfoResult.path;
          projectInfoHandledBySettings = true;
          console.log('Applied project info from settings path:', projectSettings.projectInfoFilePath);
        } else {
          console.warn(`Project info file specified in settings not found or invalid: ${projectSettings.projectInfoFilePath}`);
        }
      } catch (error) {
        console.error(`Error reading project info from settings path: ${projectSettings.projectInfoFilePath}`, error);
      }
    }
    
    // If project info wasn't handled by settings, try auto-discovery
    if (!projectInfoHandledBySettings) {
      const projectInfoResult = await readProjectInfo(basePath);
      if (projectInfoResult !== null) {
        config.project_info = projectInfoResult.content;
        config.project_info_path = projectInfoResult.path;
        console.log('Applied project info from auto-discovery:', projectInfoResult.path);
      } else {
        // config.project_info is already '' and project_info_path is undefined from fallbackConfig.
        // This log confirms that neither settings nor auto-discovery provided project info.
        console.log('No project info found from settings or auto-discovery. Project info will be empty.');
      }
    }
    
    return config;
  } catch (error) {
    console.error('Error reading Athanor configuration:', error);
    return getFallbackConfig(basePath); // Fallback in case of unexpected errors during the process
  }
}

