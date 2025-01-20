// AI Summary: Provides utilities for detecting and extracting context from task descriptions.
// Handles detection of specific commit formats and maintains proper formatting.

/** Represents a context detected within task content */
interface DetectedContext {
  /** The formatted context string for display */
  value: string;
  /** The type of context detected */
  type: 'commit';
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

  // Detect commit references in "# Commit X: description" format
  const commitRegex = /# Commit (\d+:?.*)/g;
  let match;
  while ((match = commitRegex.exec(content)) !== null) {
    contexts.push({
      value: match[1].trim(),
      type: 'commit',
      source: match[0],
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
  if (context.type === 'commit') {
    return `We are now working on Commit ${context.value}`;
  }
  return context.value;
}

/**
 * Checks if a detected context is relevant to the given task content
 * @param context - The context to check
 * @param taskContent - The task content to check against
 * @returns True if the context is relevant to the task content
 */
export function isContextRelevant(
  context: DetectedContext,
  taskContent: string
): boolean {
  return taskContent.toLowerCase().includes(context.source.toLowerCase());
}
