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
  return template.replace(/(\n?)\{\{([\s\S]+?)\}\}(\n?)/g, (match, leadingNewline: string, expression: string, trailingNewline: string) => {
    const trimmedExpression = expression.trim();
    const conditionalMarkerIndex = trimmedExpression.indexOf('?');

    let result: string;

    if (conditionalMarkerIndex === -1) {
      // --- Simple variable substitution (backward compatible) ---
      const key = trimmedExpression as keyof PromptVariables;
      const value = variables[key];
      // Handle task context specially - only include if it exists
      if (key === 'task_context' && (!value || (typeof value === 'string' && value.trim() === ''))) {
        result = '';
      } else {
        result = value !== undefined ? String(value) : '';
      }
    } else {
      // --- Conditional 'ternary' substitution ---
      const conditionKey = trimmedExpression.substring(0, conditionalMarkerIndex).trim() as keyof PromptVariables;
      const rest = trimmedExpression.substring(conditionalMarkerIndex + 1).trim();

      // Parse ternary expression with backtick-delimited strings
      // Expected format: condition ? `true_value` : `false_value` or condition ? `true_value`
      const ternaryMatch = rest.match(/^\s*`([\s\S]*?)`(?:\s*:\s*`([\s\S]*?)`)?\s*$/);
      
      let trueText: string;
      let falseText: string = ''; // Default to empty string if no 'else' part

      if (ternaryMatch) {
        // Backtick format matched - unescape any escaped backticks
        trueText = ternaryMatch[1].replace(/\\`/g, '`');
        if (ternaryMatch[2] !== undefined) {
          falseText = ternaryMatch[2].replace(/\\`/g, '`');
        }
      } else {
        // Fallback to old quote-based parsing for backward compatibility
        const elseMarkerIndex = rest.indexOf(':');
        
        if (elseMarkerIndex === -1) {
          trueText = rest;
        } else {
          trueText = rest.substring(0, elseMarkerIndex).trim();
          falseText = rest.substring(elseMarkerIndex + 1).trim();
        }

        // Remove quotes from the start and end of the text parts
        const unquote = (text: string) => {
            if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
                return text.slice(1, -1);
            }
            return text;
        };

        trueText = unquote(trueText);
        falseText = unquote(falseText);
      }

      const conditionValue = !!variables[conditionKey]; // Evaluate truthiness
      result = conditionValue ? trueText : falseText;
    }

    // If result is empty, don't include the captured newlines
    if (result === '') {
      return '';
    }

    // If result is not empty, preserve the captured newlines
    return leadingNewline + result + trailingNewline;
  });
}
