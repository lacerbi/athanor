// AI Summary: Displays file content with syntax highlighting. Handles both text and binary files
// with appropriate feedback. Maintains line count and path display for valid text files.
// Now includes a "Replace with Clipboard" button that stages changes and navigates to Apply Changes tab.
import React, { useEffect, useState } from 'react';
import { Copy, FileCode, ClipboardPaste, WrapText } from 'lucide-react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coy, atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
// Import specific languages to keep bundle size manageable
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import html from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import ruby from 'react-syntax-highlighter/dist/esm/languages/prism/ruby';
import php from 'react-syntax-highlighter/dist/esm/languages/prism/php';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust';
import swift from 'react-syntax-highlighter/dist/esm/languages/prism/swift';
import ini from 'react-syntax-highlighter/dist/esm/languages/prism/ini';
import diff from 'react-syntax-highlighter/dist/esm/languages/prism/diff';

import { useFileSystemStore } from '../stores/fileSystemStore';
import { useLogStore } from '../stores/logStore';
import { useCommandStore } from '../stores/commandStore';
import { useApplyChangesStore } from '../stores/applyChangesStore';
import { useSettingsStore } from '../stores/settingsStore';
import { copyToClipboard } from '../actions/ManualCopyAction';
import { isTextFile } from '../utils/fileTextDetection';
import { getLanguageFromPath } from '../utils/languageMapping';
import { TabType } from './AthanorTabs';
import { FileOperation } from '../types/global';

// Register languages with SyntaxHighlighter
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('html', html);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('yaml', yaml);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('c', c);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('ruby', ruby);
SyntaxHighlighter.registerLanguage('php', php);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('rust', rust);
SyntaxHighlighter.registerLanguage('swift', swift);
SyntaxHighlighter.registerLanguage('ini', ini);
SyntaxHighlighter.registerLanguage('diff', diff);
SyntaxHighlighter.registerLanguage('text', javascript); // Fallback to basic highlighting

interface FileViewerPanelProps {
  onTabChange: (tab: TabType) => void;
}

const FileViewerPanel: React.FC<FileViewerPanelProps> = ({ onTabChange }) => {
  const { previewedFilePath } = useFileSystemStore();
  const { addLog } = useLogStore();
  const { applicationSettings, saveApplicationSettings } = useSettingsStore();
  const isWrapEnabled = applicationSettings?.fileViewerWrapEnabled ?? false;
  const [fileContent, setFileContent] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [lineCount, setLineCount] = useState<number>(0);
  const [osPath, setOsPath] = useState<string>('');
  const [currentDir, setCurrentDir] = useState<string>('');
  const [isText, setIsText] = useState<boolean>(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    document.documentElement.classList.contains('dark')
  );

  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const loadFile = async () => {
      if (!previewedFilePath) {
        setFileContent('');
        setError('');
        setLineCount(0);
        setOsPath('');
        return;
      }

      try {
        // Get current directory and OS-specific path
        const dir = await window.fileService.getCurrentDirectory();
        setCurrentDir(dir);
        
        const resolvedPath = await window.fileService.resolve(previewedFilePath);
        setOsPath(resolvedPath);

        const isDirectory = await window.fileService.isDirectory(previewedFilePath);
        if (isDirectory) {
          setFileContent('');
          setError('Cannot display folder contents.');
          setLineCount(0);
          return;
        }

        // Check if file is text-based
        const isTextFileResult = await isTextFile(previewedFilePath);
        setIsText(isTextFileResult);

        if (!isTextFileResult) {
          setFileContent('');
          setError('Cannot preview file content (binary or unsupported format)');
          setLineCount(0);
          return;
        }

        const content = await window.fileService.read(previewedFilePath, {
          encoding: 'utf8',
        });
        const contentStr = content as string;
        setFileContent(contentStr);
        setLineCount(contentStr.split('\n').length);
        setError('');
      } catch (err) {
        console.error('Error reading file:', err);
        setError('Error reading file content.');
        setFileContent('');
        setLineCount(0);
      }
    };

    void loadFile();
  }, [previewedFilePath]);

  return (
    <div className="w-full h-full flex flex-col space-y-2">
      {previewedFilePath ? (
        <>
          <div className="flex items-center justify-between text-sm mb-2">
            <div className="flex-grow text-gray-600 dark:text-gray-300">
              <span className="truncate" title={osPath}>{osPath}</span>
              {lineCount > 0 && (
                <span className="text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">({lineCount} lines)</span>
              )}
            </div>
            {isText && (
              <div className="flex gap-2">
                <button
                  className={`px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 rounded flex items-center gap-1 ${
                    isWrapEnabled
                      ? 'bg-gray-200 dark:bg-gray-600'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  onClick={async () => {
                    if (applicationSettings) {
                      await saveApplicationSettings({
                        ...applicationSettings,
                        fileViewerWrapEnabled: !isWrapEnabled,
                      });
                    }
                  }}
                  title="Toggle Word Wrap"
                >
                  <WrapText className="w-4 h-4" />
                  <span>Wrap</span>
                </button>
                <button
                  className="px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-1"
                  onClick={() => {
                    if (fileContent) {
                      void copyToClipboard({
                        content: fileContent,
                        addLog,
                        isFormatted: false
                      });
                    }
                  }}
                  title="Copy raw content"
                  disabled={!fileContent}
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </button>
                <button
                  className="px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-1"
                  onClick={() => {
                    if (fileContent && previewedFilePath) {
                      void copyToClipboard({
                        content: fileContent,
                        filePath: previewedFilePath,
                        rootPath: currentDir,
                        addLog,
                        isFormatted: true
                      });
                    }
                  }}
                  title="Copy with file path and code formatting"
                  disabled={!fileContent}
                >
                  <FileCode className="w-4 h-4" />
                  <span>Formatted Copy</span>
                </button>
                <button
                  className="px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-1"
                  onClick={async () => {
                    const { addLog: log } = useLogStore.getState(); // Renamed to avoid conflict
                    const { setOperations, clearOperations } = useApplyChangesStore.getState();
                    const clipboardContent = useCommandStore.getState().clipboardContent;

                    // Use osPath for relativization; ensure it's available.
                    // previewedFilePath is the primary key from the store, osPath is its absolute representation.
                    if (!previewedFilePath || !osPath || !fileContent || !clipboardContent || typeof clipboardContent !== 'string') {
                      log('Replace failed: Invalid state (no file/osPath, empty content, or empty/invalid clipboard).');
                      return;
                    }

                    try {
                      const relativePathForOperation = await window.fileService.relativize(osPath);
                      if (!relativePathForOperation) {
                          log(`Replace failed: Could not determine relative path for ${osPath}.`);
                          return;
                      }
                    
                      const operation: FileOperation = {
                        file_message: `Replace content of ${relativePathForOperation} with clipboard content.`,
                        file_operation: 'UPDATE_FULL',
                        file_path: relativePathForOperation,
                        new_code: clipboardContent,
                        old_code: fileContent,
                        accepted: false,
                        rejected: false,
                      };
                    
                      clearOperations();
                      setOperations([operation]);
                    
                      log(`Prepared to replace ${relativePathForOperation} with clipboard content. Review in Apply Changes tab.`);
                      
                      if (onTabChange) {
                        onTabChange('apply-changes');
                      } else {
                        console.error("onTabChange callback is not available in FileViewerPanel.");
                        log("Error: Could not navigate to Apply Changes tab.");
                      }
                    } catch (error) {
                      console.error("Error during replace with clipboard action:", error);
                      log(`Error preparing replacement for ${osPath}: ${error instanceof Error ? error.message : String(error)}`);
                    }
                  }}
                  title="Replace file content with clipboard"
                  disabled={
                    !previewedFilePath ||
                    !isText ||
                    !!error ||
                    !useCommandStore.getState().clipboardContent ||
                    typeof useCommandStore.getState().clipboardContent !== 'string'
                  }
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>Replace</span>
                </button>
              </div>
            )}
          </div>
          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-800 p-2 rounded bg-red-50 dark:bg-red-900/50 mb-2">
              {error}
            </div>
          )}
        </>
      ) : (
        <div className="text-sm text-gray-400 dark:text-gray-500 mb-2">
          {!previewedFilePath ? 'No file selected for preview' : 'Loading file...'}
        </div>
      )}
      {isText && !error && fileContent && (
        <div className={`w-full h-full rounded font-mono text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 scrollbar-thin file-viewer-syntax-highlighter-wrapper ${
          isWrapEnabled ? 'overflow-auto' : 'overflow-hidden'
        }`}>
          <SyntaxHighlighter
            language={getLanguageFromPath(previewedFilePath || '')}
            style={isDarkMode ? atomDark : coy}
            showLineNumbers={true}
            wrapLines={true}
            wrapLongLines={isWrapEnabled}
            lineNumberStyle={{ 
              opacity: 0.5,
              color: isDarkMode ? '#6b7280' : '#9ca3af',
              backgroundColor: 'transparent',
              borderRight: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
              paddingRight: '0.5rem',
              marginRight: '0.5rem',
              minWidth: '2.5rem',
              textAlign: 'right'
            }}
            customStyle={{
              margin: 0,
              padding: '0.5rem',
              backgroundColor: 'transparent',
              minHeight: '100%',
              flexGrow: 1,
              fontSize: '0.875rem',
              lineHeight: '1.25rem',
              overflowX: isWrapEnabled ? 'hidden' : 'auto',
              overflowY: 'auto',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box'
            }}
            codeTagProps={{
              style: { 
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: 'inherit',
                lineHeight: 'inherit'
              }
            }}
            lineProps={(lineNumber) => ({
              style: {
                display: 'block',
                width: '100%',
                paddingLeft: isWrapEnabled ? '3.4rem' : '0',
                textIndent: isWrapEnabled ? '-3.4rem' : '0'
              }
            })}
          >
            {fileContent}
          </SyntaxHighlighter>
        </div>
      )}
      {isText && !error && !fileContent && previewedFilePath && (
        <div className="w-full h-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded font-mono text-sm flex items-center justify-center">
          File is empty.
        </div>
      )}
      {!previewedFilePath && (
        <div className="w-full h-full flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-4xl mb-4">📄</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              File Viewer
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Select a file from the explorer to view its contents here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileViewerPanel;
