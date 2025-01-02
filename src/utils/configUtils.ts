// AI Summary: Handles reading and parsing Athanor configuration files with fallback values.
// Provides default project name and info when configuration file is missing or invalid.
import { parse } from 'yaml';
import { AthanorConfig } from '../types/global';
import { getBaseName } from './fileTree';

// Get fallback config values based on the base directory
export function getFallbackConfig(basePath: string): AthanorConfig {
  return {
    project_name: getBaseName(basePath),
    project_info: '',
  };
}

export async function readAthanorConfig(
  basePath: string
): Promise<AthanorConfig> {
  try {
    const configPath = `${basePath}/athanor.yml`;
    const configContent = await window.fileSystem.readFile(configPath, 'utf8');
    const parsedConfig = parse(configContent as string) as AthanorConfig;

    // Merge with fallback values for any missing fields
    const fallbackConfig = getFallbackConfig(basePath);
    return {
      ...fallbackConfig,
      ...parsedConfig,
    };
  } catch (error) {
    console.log(
      'No athanor.yml found or invalid format, using fallback values'
    );
    return getFallbackConfig(basePath);
  }
}
