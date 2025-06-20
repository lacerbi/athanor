// AI Summary: Generates codebase documentation including file tree visualization and code content.
// Handles language detection for code blocks and provides smart previews for large files.
// Supports strict selection mode through includeNonSelected parameter.
import { FileItem, sortItems, isEmptyFolder, getBaseName } from './fileTree';
import { AthanorConfig } from '../types/global';
import { areAllDescendantsSelected } from './fileSelection';
import { FILE_SYSTEM, DOC_FORMAT } from './constants';
import { isTextFile } from './fileTextDetection';

// Get the appropriate language for code block formatting
export function getFileLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rb: 'ruby',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    php: 'php',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    md: 'markdown',
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'bash',
    bash: 'bash',
    sql: 'sql',
  };
  return languageMap[ext] || 'plaintext';
}

// Generate tree visualization
function generateFileTree(
  items: FileItem[],
  selectedItems: Set<string>,
  level: number = 0,
  isLast: boolean = true,
  parentPrefix: string = ''
): string {
  if (!items || items.length === 0) return '';

  let result = '';
  items.forEach((item, index) => {
    const isLastItem = index === items.length - 1;
    const prefix = level === 0 ? '' : `${parentPrefix}${isLast ? '' : '│   '}`;
    const connector = level === 0 ? '' : `${isLastItem ? '└── ' : '├── '}`;
    const isSelected =
      !isEmptyFolder(item) && areAllDescendantsSelected(item, selectedItems);
    // Use "." for root level folder instead of actual folder name
    const displayName = level === 0 ? '.' : item.name;

    result += `${prefix}${connector}${displayName}${item.type === 'folder' ? '/' : ''}${isSelected ? ' *' : ''}\n`;

    if (item.type === 'folder' && item.children?.length) {
      result += generateFileTree(
        sortItems(item.children),
        selectedItems,
        level + 1,
        isLastItem,
        prefix
      );
    }
  });

  return result;
}

// Smart content preview for non-selected files
export function getSmartPreview(content: string, config: { minLines: number; maxLines: number }): string {
  const lines = content.split('\n');

  // If the file is not longer than maxLines, return it in full
  if (lines.length <= config.maxLines) {
    return content;
  }

  // Always show at least minLines
  let endLine = config.minLines;
  let emptyLinesCount = lines
    .slice(0, config.minLines)
    .filter((line) => line.trim() === '').length;

  // If we haven't found at least two empty lines, keep looking up to maxLines
  if (emptyLinesCount < 2 && lines.length > config.minLines) {
    for (
      let i = config.minLines;
      i < Math.min(lines.length, config.maxLines);
      i++
    ) {
      if (lines[i].trim() === '') {
        endLine = i + 1; // Include the empty line
        break;
      }
      endLine = i + 1;
    }
  }

  return lines.slice(0, endLine).join('\n') + '\n... (content truncated)';
}

// Sanitize a filename for use in XML tags
export function sanitizeForXmlTag(filePath: string): string {
  // Extract just the filename without path
  const baseName = getBaseName(filePath);
  
  // Replace non-alphanumeric characters (except underscores) with underscores
  // Keep file extension but replace the dot with underscore
  let sanitized = baseName.replace(/[^a-zA-Z0-9_]/g, '_');
  
  // Ensure the tag starts with a letter (XML requirement)
  if (!/^[a-zA-Z]/.test(sanitized)) {
    sanitized = 'file_' + sanitized;
  }
  
  return sanitized;
}

// Format a single file's content with appropriate code block or XML tags
export function formatSingleFile(
  filePath: string,
  content: string,
  rootPath: string = '',
  isSelected: boolean = false,
  formatType: string = DOC_FORMAT.MARKDOWN,
  currentThresholdLineLength?: number // Added for future use, not currently used in this function's logic
): string {
  const relativePath = rootPath
    ? filePath.replace(rootPath, '').replace(/^[/\\]/, '')
    : filePath;
  
  if (formatType === DOC_FORMAT.XML) {
    const tagName = sanitizeForXmlTag(relativePath);
    return `# ${relativePath}${isSelected ? ' *' : ''}\n\n<file_${tagName}>\n${content}\n</file_${tagName}>\n`;
  } else {
    // Default to markdown formatting
    const language = getFileLanguage(filePath);
    return `# ${relativePath}${isSelected ? ' *' : ''}\n\n\`\`\`${language}\n${content}\n\`\`\`\n`;
  }
}

// Generate full codebase documentation
export async function generateCodebaseDocumentation(
  items: FileItem[],
  selectedItems: Set<string>,
  neighboringItems: Set<string>,
  rootPath: string,
  config: AthanorConfig | null,
  formatType: string = DOC_FORMAT.MARKDOWN,
  projectInfoFilePath?: string,
  smartPreviewConfig: { minLines: number; maxLines: number } = { minLines: 10, maxLines: 20 },
  currentThresholdLineLength?: number, // Added, to be passed down if needed
  enableSmartPreview: boolean = true
): Promise<{ file_contents: string; file_tree: string }> {
  const rawFileTreeContent = generateFileTree(items, selectedItems);
  const fileTreeContent = `<file_tree>\n${rawFileTreeContent}</file_tree>\n`;
  let fileContents = '';

  // Process each file
  const processItem = async (item: FileItem): Promise<void> => {
    if (item.type === 'file') {
      const isSelected = selectedItems.has(item.id);
      const isNeighboring = neighboringItems.has(item.id);

      // If it's a neighboring file and smart previews are turned off, skip it entirely.
      if (isNeighboring && !isSelected && !enableSmartPreview) {
        return;
      }

      // Only include content for selected or neighboring files
      if (!isSelected && !isNeighboring) {
        return;
      }

      // Check if this file is the source of project_info
      if (projectInfoFilePath && item.path === projectInfoFilePath) {
        const relativePath = rootPath
          ? item.path.replace(rootPath, '').replace(/^[/\\]/, '')
          : item.path;
        
        // Add placeholder message instead of duplicating content
        fileContents += (fileContents ? '\n' : '') +
          `# ${relativePath}${isSelected ? ' *' : ''}\n\n` +
          `The content of this file is fully reported above inside \`<project_info>\` tags.\n`;
        return;
      }

      try {
        const isText = await isTextFile(item.path);
        if (!isText) {
          console.log('Skipping non-text file: ${item.path}');
          return;
        }
        const content = await window.fileSystem.readFile(item.path, {
          encoding: 'utf8',
        });

        // Ensure content is treated as string since we specified utf8 encoding
        const contentString = content.toString();

        // Use full content for selected files, smart preview for neighboring files
        const processedContent = isSelected
          ? contentString
          : getSmartPreview(contentString, smartPreviewConfig);

        if (processedContent) {
          fileContents +=
            (fileContents ? '\n' : '') +
            formatSingleFile(item.path, processedContent, rootPath, isSelected, formatType, currentThresholdLineLength);
        }
      } catch (error) {
        console.error(`Error reading file ${item.path}:`, error);
      }
    }

    if (item.children) {
      for (const child of sortItems(item.children)) {
        await processItem(child);
      }
    }
  };

  for (const item of sortItems(items)) {
    await processItem(item);
  }

  return {
    file_contents: fileContents,
    file_tree: fileTreeContent,
  };
}
