// AI Summary: Loads and parses prompt XML files from resources directory using regex-based parsing.
// Extracts prompt metadata and variants, integrating with promptStore for data storage.
import { PromptData, PromptVariant } from '../types/promptTypes';
import { usePromptStore } from '../stores/promptStore';
import { readFileContent } from './fileSystemService';

// Regular expressions for parsing prompt files
const PROMPT_TAG_REGEX = /<ath_prompt\s+([^>]+)>/;
const VARIANT_TAG_REGEX =
  /<ath_prompt_variant\s+([^>]+)>([\s\S]*?)<\/ath_prompt_variant>/g;
const ATTRIBUTES_REGEX = /(\w+)="([^"]*?)"/g;

// Parse attributes from an XML tag string
function parseAttributes(attributesStr: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  let match;
  while ((match = ATTRIBUTES_REGEX.exec(attributesStr)) !== null) {
    attributes[match[1]] = match[2];
  }
  return attributes;
}

// Parse a single prompt file
async function parsePromptFile(filePath: string): Promise<PromptData | null> {
  try {
    const content = await readFileContent(filePath);

    // Parse prompt attributes
    const promptMatch = PROMPT_TAG_REGEX.exec(content);
    if (!promptMatch || !promptMatch[1]) {
      console.warn(`No valid ath_prompt tag found in ${filePath}`);
      return null;
    }

    const promptAttrs = parseAttributes(promptMatch[1]);
    if (!promptAttrs.id || !promptAttrs.label) {
      console.warn(`Missing required attributes (id/label) in ${filePath}`);
      return null;
    }

    // Parse variants
    const variants: PromptVariant[] = [];
    let variantMatch;
    while ((variantMatch = VARIANT_TAG_REGEX.exec(content)) !== null) {
      const variantAttrs = parseAttributes(variantMatch[1]);
      if (!variantAttrs.id || !variantAttrs.label) continue;

      variants.push({
        id: variantAttrs.id,
        label: variantAttrs.label,
        tooltip: variantAttrs.tooltip,
        content: variantMatch[2].trim(),
      });
    }

    if (variants.length === 0) {
      console.warn(`No valid variants found in ${filePath}`);
      return null;
    }

    return {
      id: promptAttrs.id,
      label: promptAttrs.label,
      icon: promptAttrs.icon,
      tooltip: promptAttrs.tooltip,
      variants,
    };
  } catch (error) {
    console.error(`Error parsing prompt file ${filePath}:`, error);
    return null;
  }
}

// Load all prompts and update the store
export async function loadPrompts(): Promise<void> {
  try {
    const resourcesPath = await window.fileSystem.getResourcesPath();
    const promptsDir = await window.fileSystem.joinPaths(
      resourcesPath,
      'prompts'
    );
    const files = await window.fileSystem.readDirectory(promptsDir);

    // Parse prompt files (starting with 'prompt_' and ending with '.xml')
    const prompts: PromptData[] = [];
    for (const file of files) {
      if (!file.startsWith('prompt_') || !file.endsWith('.xml')) {
        continue;
      }

      const filePath = await window.fileSystem.joinPaths(promptsDir, file);
      const promptData = await parsePromptFile(filePath);
      if (promptData) {
        prompts.push(promptData);
      } else {
        console.log('Failed to parse prompt:', file);
      }
    }

    // Update store
    usePromptStore.getState().setPrompts(prompts);
  } catch (error) {
    console.error('Error loading prompts:', error);
    throw error;
  }
}
