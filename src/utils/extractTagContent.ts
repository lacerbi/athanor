// AI Summary: Utility for extracting content between XML tags.
// Handles start and end tag matching with proper content trimming.
export function extractTagContent(content: string, tagName: string): string {
  const startTag = `<${tagName}>`;
  const endTag = `</${tagName}>`;
  const startIndex = content.indexOf(startTag);
  const endIndex = content.indexOf(endTag);
  if (startIndex === -1 || endIndex === -1) return '';
  return content.slice(startIndex + startTag.length, endIndex).trim();
}
