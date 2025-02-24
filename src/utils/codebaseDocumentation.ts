// AI Summary: Generates codebase documentation including file tree visualization and code content.
// Handles language detection for code blocks and provides smart previews for large files.
// Supports strict selection mode through includeNonSelected parameter.
import { FileItem, sortItems, isEmptyFolder, getBaseName } from './fileTree';
import { AthanorConfig } from '../types/global';
import { areAllDescendantsSelected } from './fileSelection';
import { FILE_SYSTEM } from './constants';
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
    const displayName = level === 0 ? getBaseName(item.path) : item.name;

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
export function getSmartPreview(content: string): string {
  const lines = content.split('\n');

  // If the file is not longer than maxLines, return it in full
  if (lines.length <= FILE_SYSTEM.maxSmartPreviewLines) {
    return content;
  }

  // Always show at least minLines
  let endLine = FILE_SYSTEM.minSmartPreviewLines;
  let emptyLinesCount = lines
    .slice(0, FILE_SYSTEM.minSmartPreviewLines)
    .filter((line) => line.trim() === '').length;

  // If we haven't found at least two empty lines, keep looking up to maxLines
  if (emptyLinesCount < 2 && lines.length > FILE_SYSTEM.minSmartPreviewLines) {
    for (
      let i = FILE_SYSTEM.minSmartPreviewLines;
      i < Math.min(lines.length, FILE_SYSTEM.maxSmartPreviewLines);
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

// Format a single file's content with appropriate code block
export function formatSingleFile(
  filePath: string,
  content: string,
  rootPath: string = '',
  isSelected: boolean = false
): string {
  const relativePath = rootPath
    ? filePath.replace(rootPath, '').replace(/^[/\\]/, '')
    : filePath;
  const language = getFileLanguage(filePath);
  return `# ${relativePath}${isSelected ? ' *' : ''}\n\n\`\`\`${language}\n${content}\n\`\`\`\n`;
}

// Generate full codebase documentation
export async function generateCodebaseDocumentation(
  items: FileItem[],
  selectedItems: Set<string>,
  rootPath: string,
  config: AthanorConfig | null,
  includeNonSelected: boolean = true
): Promise<{ file_contents: string; file_tree: string }> {
  const rawFileTreeContent = generateFileTree(items, selectedItems);
  const fileTreeContent = `<file_tree>\n${rawFileTreeContent}</file_tree>`;
  let fileContents = '';

  // Process each file
  const processItem = async (item: FileItem): Promise<void> => {
    if (item.type === 'file') {
      const isSelected = selectedItems.has(item.id);

      // Skip non-selected files when includeNonSelected is false
      if (!includeNonSelected && !isSelected) {
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
        // Only include full content for selected files, non-selected files get smart preview if includeNonSelected is true
        const processedContent = isSelected 
          ? contentString 
          : includeNonSelected ? getSmartPreview(contentString) : '';
        if (processedContent) {
          fileContents +=
            (fileContents ? '\n' : '') +
            formatSingleFile(item.path, processedContent, rootPath, isSelected);
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
