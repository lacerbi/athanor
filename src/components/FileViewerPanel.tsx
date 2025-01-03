// AI Summary: Displays file content with text file detection. Handles both text and binary files
// with appropriate feedback. Maintains line count and path display for valid text files.
import React, { useEffect, useState } from 'react';
import { Copy, FileCode } from 'lucide-react';
import { useFileSystemStore } from '../stores/fileSystemStore';
import { useLogStore } from '../stores/logStore';
import { copyToClipboard } from '../actions/ManualCopyAction';
import { isTextFile } from '../utils/fileTextDetection';

const FileViewerPanel: React.FC = () => {
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
        const dir = await window.fileSystem.getCurrentDirectory();
        setCurrentDir(dir);
        
        const resolvedPath = await window.fileSystem.toOSPath(previewedFilePath);
        setOsPath(resolvedPath);

        const isDirectory = await window.fileSystem.isDirectory(previewedFilePath);
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

        const content = await window.fileSystem.readFile(previewedFilePath, {
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
              {osPath}
              {lineCount > 0 && (
                <span className="text-gray-500 ml-2">({lineCount} lines)</span>
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
      <textarea
        className="w-full h-full p-2 border rounded font-mono text-sm resize-none overflow-auto"
        value={fileContent}
        readOnly
        placeholder={isText ? "File content will appear here..." : "Cannot preview file content"}
      />
    </div>
  );
};

export default FileViewerPanel;
