// AI Summary: Displays file content with text file detection. Handles both text and binary files
// with appropriate feedback. Maintains line count and path display for valid text files.
// Now includes a "Replace with Clipboard" button that stages changes and navigates to Apply Changes tab.
import React, { useEffect, useState } from 'react';
import { Copy, FileCode, ClipboardPaste } from 'lucide-react';
import { useFileSystemStore } from '../stores/fileSystemStore';
import { useLogStore } from '../stores/logStore';
import { useCommandStore } from '../stores/commandStore';
import { useApplyChangesStore } from '../stores/applyChangesStore';
import { copyToClipboard } from '../actions/ManualCopyAction';
import { isTextFile } from '../utils/fileTextDetection';
import { TabType } from './AthanorTabs';
import { FileOperation } from '../types/global';

interface FileViewerPanelProps {
  onTabChange: (tab: TabType) => void;
}

const FileViewerPanel: React.FC<FileViewerPanelProps> = ({ onTabChange }) => {
  const { previewedFilePath } = useFileSystemStore();
  const { addLog } = useLogStore();
  const [fileContent, setFileContent] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [lineCount, setLineCount] = useState<number>(0);
  const [osPath, setOsPath] = useState<string>('');
  const [currentDir, setCurrentDir] = useState<string>('');
  const [isText, setIsText] = useState<boolean>(true);

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
            <div className="flex-grow text-gray-600">
              <span className="truncate" title={osPath}>{osPath}</span>
              {lineCount > 0 && (
                <span className="text-gray-500 ml-2 flex-shrink-0">({lineCount} lines)</span>
              )}
            </div>
            {isText && (
              <div className="flex gap-2">
                <button
                  className="px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded flex items-center gap-1"
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
                  className="px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded flex items-center gap-1"
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
                  className="px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded flex items-center gap-1"
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
            <div className="text-red-600 text-sm border p-2 rounded bg-red-50 mb-2">
              {error}
            </div>
          )}
        </>
      ) : (
        <div className="text-sm text-gray-400 mb-2">
          No file selected for preview
        </div>
      )}
      {isText && !error && (
        <textarea
          className="w-full h-full p-2 border rounded font-mono text-sm resize-none overflow-auto"
          value={fileContent}
          readOnly
          placeholder="File content will appear here..."
        />
      )}
    </div>
  );
};

export default FileViewerPanel;