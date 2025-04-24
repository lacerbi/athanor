// AI Summary: Handles loading prompt templates and substituting variables.
// Uses template paths resolved by the main process and properly handles empty values.
// Provides functions for template loading, variable substitution, and task description extraction.
import { PromptVariables } from './buildPrompt';
import { extractTagContent } from './extractTagContent';
// Load a template from the prompts folder
export async function loadTemplateContent(
  templateName: string
): Promise<string> {
  try {
    const templatePath =
      await window.fileSystem.getPromptTemplatePath(templateName);
    const content = await window.fileSystem.readFile(templatePath, {
      encoding: 'utf8',
    });
    return content as string;
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error);
    throw new Error(`Failed to load template ${templateName}`);
  }
}
// Extract task description from a template
export function extractTaskDescription(templateContent: string): string {
  return extractTagContent(templateContent, 'task_description');
}
// Substitute variables in template content
export function substituteVariables(
  template: string,
  variables: PromptVariables
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key as keyof PromptVariables];
    // Handle task context specially - only include if it exists
    if (key === 'task_context' && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return '';
    }
    // Ensure we convert any value to string
    const result = value !== undefined ? String(value) : '';
    return result;
  });
}
