// AI Summary: Provides utilities for detecting and extracting context from task descriptions.
// Handles detection of commits, branches, features and other contextual information.

/** Represents a context detected within task content */
interface DetectedContext {
  /** The formatted context string for display */
  value: string;
  /** The type of context detected */
  type: 'commit' | 'branch' | 'feature' | 'other';
  /** The original source text that matched the context pattern */
  source: string;
}

/**
 * Detects potential contexts from task description text
 * @param content - The task description text to analyze
 * @returns Array of detected contexts with their types and sources
 */
export function detectContexts(content: string): DetectedContext[] {
  const contexts: DetectedContext[] = [];
  
  // Detect commit references
  const commitRegex = /commit (\d+|[a-f0-9]{7,40})/gi;
  let match;
  while ((match = commitRegex.exec(content)) !== null) {
    contexts.push({
      value: `Commit ${match[1]}`,
      type: 'commit',
      source: match[0]
    });
  }
  
  // Detect branch names
  const branchRegex = /branch[:\s]+([a-zA-Z0-9\/_-]+)/gi;
  while ((match = branchRegex.exec(content)) !== null) {
    contexts.push({
      value: `Branch: ${match[1]}`,
      type: 'branch',
      source: match[0]
    });
  }
  
  // Detect features
  const featureRegex = /feature[:\s]+([a-zA-Z0-9\s_-]+)/gi;
  while ((match = featureRegex.exec(content)) !== null) {
    contexts.push({
      value: `Feature: ${match[1].trim()}`,
      type: 'feature',
      source: match[0]
    });
  }
  
  return contexts;
}

/**
 * Formats a detected context for display in the UI
 * @param context - The context to format
 * @returns Formatted string representation
 */
export function formatContext(context: DetectedContext): string {
  return context.value;
}

/**
 * Checks if a detected context is relevant to the given task content
 * @param context - The context to check
 * @param taskContent - The task content to check against
 * @returns True if the context is relevant to the task content
 */
export function isContextRelevant(context: DetectedContext, taskContent: string): boolean {
  return taskContent.toLowerCase().includes(context.source.toLowerCase());
}
