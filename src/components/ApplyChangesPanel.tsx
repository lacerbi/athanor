// AI Summary: Displays and manages file changes from AI output with diff visualization.
// Provides GitHub-style diff highlighting with accept/reject controls.
// Handles warnings for large files and tracks change approval state.
import React, { useState, useEffect } from 'react';
import { createPatch } from 'diff';
import { AlertTriangle } from 'lucide-react';
import { useApplyChangesStore } from '../stores/applyChangesStore';
import { useFileSystemStore } from '../stores/fileSystemStore';
import { useWorkbenchStore } from '../stores/workbenchStore';
import { useSettingsStore } from '../stores/settingsStore';
import { getSmartPreview } from '../utils/codebaseDocumentation';
import { SETTINGS } from '../utils/constants';

interface DiffLineProps {
  content: string;
  type: 'add' | 'remove' | 'context' | 'header';
}

const DiffLine: React.FC<DiffLineProps> = ({ content, type }) => {
  const baseClass = 'font-mono text-xs leading-5 whitespace-pre';
  let lineClass = baseClass;
  let prefix = ' ';

  switch (type) {
    case 'add':
      lineClass +=
        ' bg-green-100 dark:bg-blue-900/30 text-green-900 dark:text-blue-100';
      prefix = '+';
      break;
    case 'remove':
      lineClass +=
        ' bg-red-100 dark:bg-orange-900/30 text-red-900 dark:text-orange-100';
      prefix = '-';
      break;
    case 'header':
      lineClass +=
        ' bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 font-semibold';
      prefix = '@';
      break;
    default:
      lineClass += ' text-gray-700 dark:text-gray-300';
      prefix = ' ';
  }

  return (
    <div className={lineClass}>
      <span className="select-none w-4 inline-block">{prefix}</span>
      {content}
    </div>
  );
};

const DiffView: React.FC<{
  oldText: string;
  newText: string;
  filePath: string;
}> = ({ oldText, newText, filePath }) => {
  // Only normalize line endings for comparison
  const normalizeForComparison = (text: string) => {
    if (!text) return '';
    return text
      .replace(/\r\n/g, '\n') // Normalize Windows line endings
      .replace(/\r/g, '\n'); // Normalize old Mac line endings
  };

  const normalizedOld = normalizeForComparison(oldText);
  const normalizedNew = normalizeForComparison(newText);

  if (normalizedOld === normalizedNew) {
    return (
      <div className="p-4 text-gray-500 dark:text-gray-400 italic">
        No changes (files are identical after normalizing line endings)
      </div>
    );
  }

  // Create diff with context
  const patch = createPatch(filePath, normalizedOld, normalizedNew, '', '', {
    context: 999999,
  });

  const lines = patch.split('\n').slice(2); // Skip the diff header

  const renderDiffLine = (line: string, index: number) => {
    if (!line && index === lines.length - 1) return null;

    if (line.startsWith('@@')) {
      return <DiffLine key={index} content={line} type="header" />;
    } else if (line.startsWith('+')) {
      return <DiffLine key={index} content={line.slice(1)} type="add" />;
    } else if (line.startsWith('-')) {
      return <DiffLine key={index} content={line.slice(1)} type="remove" />;
    } else {
      return <DiffLine key={index} content={line.slice(1)} type="context" />;
    }
  };

  return (
    <div className="overflow-x-auto bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 p-2 min-w-0">
      <div className="space-y-0 min-w-max">
        {lines.map((line, index) => renderDiffLine(line, index))}
      </div>
    </div>
  );
};

interface FileOperationItemProps {
  operation: any;
  index: number;
  onAccept: (idx: number) => void;
  onReject: (idx: number) => void;
}

const FileOperationItem: React.FC<FileOperationItemProps> = ({
  operation: op,
  index,
  onAccept,
  onReject,
}) => {
  const [showWarning, setShowWarning] = useState(false);
  const { tabs, activeTabIndex } = useWorkbenchStore();
  const { applicationSettings } = useSettingsStore();

  useEffect(() => {
    const checkWarning = async () => {
      try {
        // If the file is being created, no warning needed
        if (
          !op.file_path ||
          op.file_path.trim() === '' ||
          op.file_operation === 'CREATE'
        ) {
          setShowWarning(false);
          return;
        }

        // Check if the file is selected in the active tab
        const activeTab = tabs[activeTabIndex];
        const selectedFiles = activeTab?.selectedFiles || [];
        const isSelected = selectedFiles.some((itemId) =>
          itemId.endsWith(op.file_path)
        );
        if (isSelected) {
          setShowWarning(false);
          return;
        }

        // Check file content - if preview is truncated, it means it's too long
        const content = await window.fileSystem.readFile(op.file_path, {
          encoding: 'utf8',
        });
        if (typeof content !== 'string') {
          setShowWarning(false);
          return;
        }

        // Get smart preview configuration from settings with fallback to defaults
        const config = {
          minLines:
            applicationSettings?.minSmartPreviewLines ??
            SETTINGS.defaults.application.minSmartPreviewLines,
          maxLines:
            applicationSettings?.maxSmartPreviewLines ??
            SETTINGS.defaults.application.maxSmartPreviewLines,
        };

        const preview = getSmartPreview(content, config);
        setShowWarning(preview.endsWith('... (content truncated)'));
      } catch (error) {
        console.error('Error checking file status:', error);
        setShowWarning(false);
      }
    };

    void checkWarning();
  }, [
    op.file_path,
    op.file_operation,
    tabs,
    activeTabIndex,
    applicationSettings,
  ]);

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-900/20 flex flex-col">
      <div className="flex justify-between items-start mb-4 flex-shrink-0">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-start gap-2">
            <p className="font-semibold break-all text-gray-900 dark:text-gray-100">
              {op.file_path}
            </p>
            {showWarning && (
              <div
                className="text-amber-500 dark:text-amber-400 flex-shrink-0"
                title="This file is not currently in focus (checkbox marked). The AI might not have had access to its full content."
              >
                <AlertTriangle className="w-4 h-4" />
              </div>
            )}
          </div>
          {op.file_message && (
            <p className="text-sm text-gray-500 dark:text-gray-400 break-words">
              {op.file_message}
            </p>
          )}
        </div>
        <div className="text-right shrink-0 ml-4">
          <span
            className={`inline-block px-2 py-1 rounded text-xs font-semibold text-white ${
              op.file_operation === 'CREATE'
                ? 'bg-green-600'
                : op.file_operation === 'DELETE'
                  ? 'bg-red-600'
                  : 'bg-blue-600'
            }`}
          >
            {op.file_operation}
          </span>
        </div>
      </div>

      <div className="min-w-0 w-full">
        <DiffView
          oldText={op.old_code}
          newText={op.new_code}
          filePath={op.file_path}
        />
      </div>

      <div className="mt-4 flex justify-between items-center flex-shrink-0">
        <div className="flex gap-2">
          <button
            className="px-3 py-1 bg-green-500 dark:bg-green-600 text-white rounded hover:bg-green-600 dark:hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
            disabled={op.accepted || op.rejected}
            onClick={() => onAccept(index)}
          >
            Accept
          </button>
          <button
            className="px-3 py-1 bg-red-500 dark:bg-red-600 text-white rounded hover:bg-red-600 dark:hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
            disabled={op.accepted || op.rejected}
            onClick={() => onReject(index)}
          >
            Reject
          </button>
        </div>

        {(op.accepted || op.rejected) && (
          <span
            className={`text-sm font-medium ${
              op.accepted
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {op.accepted ? 'Changes Accepted' : 'Changes Rejected'}
          </span>
        )}
      </div>
    </div>
  );
};

const ApplyChangesPanel: React.FC = () => {
  const { activeOperations, applyChange, rejectChange } =
    useApplyChangesStore();
  const { fileTree } = useFileSystemStore();

  const hasProject = fileTree.length > 0;

  if (!hasProject) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚡</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Apply AI Changes
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            When you get code suggestions from AI assistants, paste them into
            the workbench. Athanor will parse the changes and show them here for
            review before applying to your files.
          </p>
          <button
            onClick={() => window.fileService.openFolder()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            Open Project Folder
          </button>
        </div>
      </div>
    );
  }

  if (!activeOperations.length) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No active operations to display.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-amber-100 dark:bg-amber-900/30 border-l-4 border-amber-500 dark:border-amber-400 p-4 text-amber-700 dark:text-amber-200">
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 011 1v3a1 1 0 11-2 0V6a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          <strong>Warning:</strong>&nbsp;Applying changes will modify files and
          may break the code. Ensure you have a backup via Git or other means.
        </div>
      </div>
      <div className="space-y-6">
        {activeOperations.map((op, idx) => (
          <FileOperationItem
            key={`${op.file_path}-${idx}`}
            operation={op}
            index={idx}
            onAccept={applyChange}
            onReject={rejectChange}
          />
        ))}
      </div>
    </div>
  );
};

export default ApplyChangesPanel;
