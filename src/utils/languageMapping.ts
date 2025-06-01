// AI Summary: Maps file extensions to programming languages for syntax highlighting.
// Provides comprehensive language detection for react-syntax-highlighter with fallback handling.

// Map file extensions to language identifiers supported by react-syntax-highlighter
const extensionToLanguageMap: { [key: string]: string } = {
  // JavaScript/TypeScript
  'js': 'javascript',
  'jsx': 'jsx',
  'ts': 'typescript',
  'tsx': 'tsx',
  'mjs': 'javascript',
  'cjs': 'javascript',
  
  // Web languages
  'html': 'html',
  'htm': 'html',
  'css': 'css',
  'scss': 'scss',
  'sass': 'sass',
  'less': 'less',
  'xml': 'xml',
  'svg': 'xml',
  
  // Data formats
  'json': 'json',
  'json5': 'json5',
  'yaml': 'yaml',
  'yml': 'yaml',
  'toml': 'toml',
  'csv': 'csv',
  'tsv': 'csv',
  
  // Markup and documentation
  'md': 'markdown',
  'markdown': 'markdown',
  'mdx': 'markdown',
  'rst': 'restructuredtext',
  
  // Programming languages
  'py': 'python',
  'pyw': 'python',
  'java': 'java',
  'kt': 'kotlin',
  'kts': 'kotlin',
  'c': 'c',
  'cpp': 'cpp',
  'cxx': 'cpp',
  'cc': 'cpp',
  'h': 'c',
  'hpp': 'cpp',
  'hxx': 'cpp',
  'rb': 'ruby',
  'php': 'php',
  'go': 'go',
  'rs': 'rust',
  'swift': 'swift',
  'cs': 'csharp',
  'vb': 'vbnet',
  'fs': 'fsharp',
  'scala': 'scala',
  'clj': 'clojure',
  'cljs': 'clojure',
  'hs': 'haskell',
  'ml': 'ocaml',
  'elm': 'elm',
  'dart': 'dart',
  'lua': 'lua',
  'r': 'r',
  'jl': 'julia',
  'pl': 'perl',
  'pm': 'perl',
  
  // Shell and scripts
  'sh': 'bash',
  'bash': 'bash',
  'zsh': 'bash',
  'fish': 'bash',
  'ps1': 'powershell',
  'psm1': 'powershell',
  'bat': 'batch',
  'cmd': 'batch',
  
  // Configuration files
  'ini': 'ini',
  'cfg': 'ini',
  'conf': 'ini',
  'config': 'ini',
  'env': 'bash',
  'gitignore': 'gitignore',
  'gitattributes': 'gitignore',
  'editorconfig': 'editorconfig',
  'dockerfile': 'dockerfile',
  'containerfile': 'dockerfile',
  
  // Build and package files
  'makefile': 'makefile',
  'mk': 'makefile',
  'cmake': 'cmake',
  'gradle': 'gradle',
  'sbt': 'scala',
  'pom': 'xml',
  'package': 'json',
  'lock': 'json',
  
  // Database and query languages
  'sql': 'sql',
  'mysql': 'sql',
  'postgres': 'sql',
  'sqlite': 'sql',
  'graphql': 'graphql',
  'gql': 'graphql',
  
  // Template engines
  'handlebars': 'handlebars',
  'hbs': 'handlebars',
  'mustache': 'handlebars',
  'twig': 'twig',
  'liquid': 'liquid',
  
  // Version control and diffs
  'diff': 'diff',
  'patch': 'diff',
  
  // Logs and plain text
  'log': 'text',
  'txt': 'text',
  'text': 'text',
  'readme': 'text',
};

// Common text file extensions for fallback detection
const commonTextExtensions = new Set([
  'txt', 'md', 'markdown', 'cfg', 'conf', 'config', 'ini', 'env', 'csv', 'tsv',
  'yml', 'yaml', 'json', 'xml', 'html', 'htm', 'css', 'js', 'jsx', 'ts', 'tsx',
  'py', 'rb', 'php', 'java', 'c', 'cpp', 'h', 'hpp', 'sh', 'bash', 'zsh', 'log',
  'diff', 'patch'
]);

/**
 * Determines the programming language for syntax highlighting based on file path
 * @param filePath Path to the file
 * @returns Language identifier for react-syntax-highlighter, or 'text' as fallback
 */
export function getLanguageFromPath(filePath: string): string {
  if (!filePath) {
    return 'text';
  }
  
  const extension = filePath.split('.').pop()?.toLowerCase();
  
  if (extension && extensionToLanguageMap[extension]) {
    return extensionToLanguageMap[extension];
  }
  
  // Fallback for known text extensions not explicitly mapped
  if (extension && commonTextExtensions.has(extension)) {
    return 'text';
  }
  
  // Default fallback
  return 'text';
}
