// AI Summary: Handles reading and parsing Athanor configuration files with fallback values.
// Provides default project name and info when configuration file is missing or invalid.
// Overrides YAML project_info with content from standard project info files when available.
import { parse } from 'yaml';
import { AthanorConfig } from '../types/global';
import { getBaseName } from './fileTree';
import { readProjectInfo, normalizeContent } from './projectInfoUtils';

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
 * 1. Project info from a file in the project root (project.md, about.md, etc.)
 * 2. Configuration from athanor.yml
 * 3. Fallback values
 * 
 * @param basePath The root path of the project
 * @returns The merged configuration with all necessary fields
 */
export async function readAthanorConfig(
  basePath: string
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
    } catch (error) {
      console.log(
        'No athanor.yml found or invalid format, using fallback values'
      );
      // Continue with fallback config
    }
    
    // Try to read project info from a text file and override YAML/fallback if found
    const projectInfoResult = await readProjectInfo(basePath);
    if (projectInfoResult !== null) {
      // Use project info from file, which already includes the XML tags
      config.project_info = projectInfoResult.content;
      config.project_info_path = projectInfoResult.path;
    } else {
      // No project info file found, ensure project_info from YAML is properly wrapped
      config.project_info_path = undefined;
      
      // If we have non-empty project_info from YAML, ensure it's wrapped in tags
      if (config.project_info && config.project_info.trim().length > 0) {
        const trimmedInfo = config.project_info.trim();
        // Only wrap if it's not already wrapped
        if (!trimmedInfo.startsWith('<project_info>') || !trimmedInfo.endsWith('</project_info>')) {
          config.project_info = normalizeContent(config.project_info);
        }
      }
    }
    
    return config;
  } catch (error) {
    console.error('Error reading Athanor configuration:', error);
    return getFallbackConfig(basePath);
  }
}
