// AI Summary: Handles reading and parsing Athanor configuration files with fallback values.
// Provides default project name and info when configuration file is missing or invalid.
// Overrides YAML project_info with content from standard project info files when available.
import { parse } from 'yaml';
import { AthanorConfig } from '../types/global';
import { getBaseName } from './fileTree';
import { readProjectInfo } from './projectInfoUtils';

// Get fallback config values based on the base directory
export function getFallbackConfig(basePath: string): AthanorConfig {
  return {
    project_name: getBaseName(basePath),
    project_info: '',
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
    const projectInfo = await readProjectInfo(basePath);
    if (projectInfo !== null) {
      config.project_info = projectInfo;
    }
    
    return config;
  } catch (error) {
    console.error('Error reading Athanor configuration:', error);
    return getFallbackConfig(basePath);
  }
}
