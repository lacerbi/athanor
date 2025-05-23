// AI Summary: Handles reading and parsing Athanor configuration files with settings integration.
// Implements proper precedence: ProjectSettings -> athanor.yml -> automatic discovery.
// Provides fallback values and handles project info file overrides from settings.

import { parse } from 'yaml';
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
 * Read Athanor configuration from various sources with the following precedence:
 * 1. ProjectSettings from project_settings.json (highest priority)
 * 2. Configuration from athanor.yml
 * 3. Project info from a file in the project root (project.md, about.md, etc.)
 * 4. Fallback values (lowest priority)
 * 
 * @param basePath The root path of the project
 * @param projectSettings Optional project settings from project_settings.json
 * @returns The merged configuration with all necessary fields
 */
export async function readAthanorConfig(
  basePath: string,
  projectSettings?: ProjectSettings | null
): Promise<AthanorConfig> {
  try {
    // Start with fallback values
    const fallbackConfig = getFallbackConfig(basePath);
    
    // Try to read YAML configuration
    let config = { ...fallbackConfig };
    try {
      const configPath = `${basePath}/athanor.yml`;
      const configContent = await window.fileSystem.readFile(configPath, 'utf8');
      const parsedConfig = parse(configContent as string) as AthanorConfig;
      
      // Merge with fallback values for any missing fields
      config = {
        ...fallbackConfig,
        ...parsedConfig,
      };
      
      console.log('Loaded configuration from athanor.yml');
    } catch (error) {
      console.log(
        'No athanor.yml found or invalid format, using fallback values'
      );
      // Continue with fallback config
    }
    
    // Apply project name from settings (highest priority)
    if (projectSettings?.projectNameOverride?.trim()) {
      config.project_name = projectSettings.projectNameOverride.trim();
      console.log('Applied project name override from settings:', config.project_name);
    }
    
    // Handle project info with settings precedence
    let projectInfoHandled = false;
    
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
          projectInfoHandled = true;
          console.log('Applied project info from settings path:', projectSettings.projectInfoFilePath);
        } else {
          console.warn(`Project info file specified in settings not found or invalid: ${projectSettings.projectInfoFilePath}`);
        }
      } catch (error) {
        console.error(`Error reading project info from settings path: ${projectSettings.projectInfoFilePath}`, error);
      }
    }
    
    // If project info wasn't handled by settings, try other sources
    if (!projectInfoHandled) {
      // Second priority: Try project info from YAML config if it looks like a file path
      if (config.project_info && config.project_info.trim().length > 0) {
        const trimmedInfo = config.project_info.trim();
        
        // Check if it looks like a file path (contains . or / and doesn't start with <)
        if ((trimmedInfo.includes('.') || trimmedInfo.includes('/')) && 
            !trimmedInfo.startsWith('<project_info>')) {
          try {
            const projectInfoResult = await readProjectInfoFromPath(basePath, trimmedInfo);
            if (projectInfoResult !== null) {
              config.project_info = projectInfoResult.content;
              config.project_info_path = projectInfoResult.path;
              projectInfoHandled = true;
              console.log('Applied project info from YAML path:', trimmedInfo);
            }
          } catch (error) {
            console.warn(`YAML project_info appears to be a path but couldn't load file: ${trimmedInfo}`, error);
          }
        }
        
        // If still not handled and it's not already wrapped, wrap the YAML content
        if (!projectInfoHandled) {
          if (!trimmedInfo.startsWith('<project_info>') || !trimmedInfo.endsWith('</project_info>')) {
            config.project_info = normalizeContent(trimmedInfo);
            console.log('Applied and normalized project info from YAML content');
          } else {
            config.project_info = trimmedInfo;
            console.log('Applied project info from YAML (already formatted)');
          }
          projectInfoHandled = true;
        }
      }
      
      // Third priority: Auto-discovery from standard files
      if (!projectInfoHandled) {
        const projectInfoResult = await readProjectInfo(basePath);
        if (projectInfoResult !== null) {
          config.project_info = projectInfoResult.content;
          config.project_info_path = projectInfoResult.path;
          console.log('Applied project info from auto-discovery:', projectInfoResult.path);
        } else {
          // Ensure empty project_info is properly set
          config.project_info = '';
          config.project_info_path = undefined;
          console.log('No project info found, using empty value');
        }
      }
    }
    
    return config;
  } catch (error) {
    console.error('Error reading Athanor configuration:', error);
    return getFallbackConfig(basePath);
  }
}
