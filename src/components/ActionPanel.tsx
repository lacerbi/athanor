// AI Summary: Main action panel component that coordinates prompt generation and file operations.
// Provides UI controls for task description and organizes prompt generators into task-based
// and file-based groups with clear visual separation. Manages state for task inputs,
// generated prompts, and clipboard operations with contextual tooltips.
import React, { useState, useEffect, useRef } from 'react';
import {
  Copy,
  BookOpen,
  FileSearch,
  Wrench,
  FileText,
  Scissors,
  Eraser,
} from 'lucide-react';
import { useFileSystemStore } from '../stores/fileSystemStore';
import { useLogStore } from '../stores/logStore';
import { useWorkbenchStore } from '../stores/workbenchStore';
import { FileItem } from '../utils/fileTree';
import { autoSelectFiles } from '../actions/AutoSelectAction';
import { buildTaskPrompt } from '../actions/BuildTaskAction';
import { copyToClipboard } from '../actions/ManualCopyAction';
import { buildSoftwareEngineerPromptAction } from '../actions/BuildSoftwareEngineerPromptAction';
import { buildAiSummaryPromptAction } from '../actions/BuildAiSummaryAction';
import { buildRefactorPromptAction } from '../actions/BuildRefactorAction';
import { getActionTooltip } from '../utils/commandDescriptions';

interface ActionPanelProps {
  rootItems: FileItem[];
  setActiveTab?: (tab: 'workbench' | 'viewer' | 'apply-changes') => void;
  isActive: boolean;
}

const ActionPanel: React.FC<ActionPanelProps> = ({
  rootItems,
  setActiveTab,
  isActive,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const {
    taskDescription,
    outputContent,
    setTaskDescription,
    setOutputContent,
    developerActionTrigger,
  } = useWorkbenchStore();

  // Handle Developer action trigger only when panel is active and a new trigger occurs
  const lastTriggerRef = useRef(developerActionTrigger);
  
  useEffect(() => {
    if (!isActive || developerActionTrigger === 0 || isLoading) return;
    
    // Only trigger if there's a new developerActionTrigger value
    if (developerActionTrigger > lastTriggerRef.current) {
      lastTriggerRef.current = developerActionTrigger;
      void buildTaskPrompt({
        rootItems,
        selectedItems,
        taskDescription,
        setOutputContent,
        addLog,
        setIsLoading,
      });
    }
  }, [developerActionTrigger, isActive]);

  const { selectedItems, clearSelections, getSelectedItems } = useFileSystemStore();
  const { addLog } = useLogStore();

  const handleManualCopy = (content: string) => {
    void copyToClipboard({ content, addLog });
  };

  const isTaskEmpty = taskDescription.trim().length === 0;
  const hasNoSelection = selectedItems.size === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Main Content Area with Two Columns */}
      <div className="flex flex-1 gap-6 min-h-0">
        {/* Left Column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Task Description Section */}
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-lg font-semibold">Task Description or Query</h2>
              <button
                onClick={() => handleManualCopy(taskDescription)}
                className="flex items-center px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                title="Copy to clipboard"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </button>
              <button
                onClick={() => setTaskDescription('')}
                disabled={taskDescription.trim().length === 0}
                className="flex items-center px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="Clear task description"
                aria-label="Clear task description"
              >
                <Eraser className="w-4 h-4 mr-1" />
                Clear
              </button>
            </div>
            <textarea
              className="flex-1 p-2 border rounded resize-none overflow-auto mb-4"
              placeholder="Describe your task here - whether it's implementing a feature, asking about the codebase, or discussing code improvements..."
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
            />

            {/* Prompt Generators Section */}
            <div className="space-y-6">
              {/* Task-Based Generators */}
              <div className="space-y-3">
                <div className="pb-2 border-b">
                  <h2 className="text-lg font-semibold">Generate Prompt From Task</h2>
                </div>
                <div className="flex space-x-2">
                  <button
                    className="w-32 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
                    onClick={() =>
                      autoSelectFiles({
                        rootItems,
                        selectedItems,
                        taskDescription,
                        setOutputContent,
                        addLog,
                        setIsLoading,
                        clearSelections,
                        getSelectedItems,
                      })
                    }
                    disabled={isLoading || isTaskEmpty}
                    title={getActionTooltip(
                      'fileHighlighter',
                      isLoading || isTaskEmpty,
                      isLoading ? 'loading' : isTaskEmpty ? 'noTask' : null
                    )}
                  >
                    <FileSearch className="w-4 h-4 mr-1" />
                    Autoselect
                  </button>

                  <button
                    className="w-32 px-3 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-teal-500"
                    onClick={() =>
                      buildSoftwareEngineerPromptAction({
                        rootItems,
                        selectedItems,
                        taskDescription,
                        setOutputContent,
                        addLog,
                        setIsLoading,
                      })
                    }
                    disabled={isLoading || isTaskEmpty}
                    title={getActionTooltip(
                      'softwareEngineer',
                      isLoading || isTaskEmpty,
                      isLoading ? 'loading' : isTaskEmpty ? 'noTask' : null
                    )}
                  >
                    <BookOpen className="w-4 h-4 mr-1" />
                    Analyze
                  </button>

                  <button
                    className="w-32 px-3 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-500"
                    onClick={() =>
                      buildTaskPrompt({
                        rootItems,
                        selectedItems,
                        taskDescription,
                        setOutputContent,
                        addLog,
                        setIsLoading,
                      })
                    }
                    disabled={isLoading || isTaskEmpty}
                    title={getActionTooltip(
                      'developer',
                      isLoading || isTaskEmpty,
                      isLoading ? 'loading' : isTaskEmpty ? 'noTask' : null
                    )}
                  >
                    <Wrench className="w-4 h-4 mr-2" />
                    Develop
                  </button>
                </div>
              </div>

              {/* File-Based Generators */}
              <div className="space-y-3">
                <div className="pb-2 border-b">
                  <h2 className="text-lg font-semibold">Load Preset Task</h2>
                </div>
                <div className="flex space-x-2">
                  <button
                    className="w-32 px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-purple-500"
                    onClick={() =>
                      buildAiSummaryPromptAction({
                        rootItems,
                        selectedItems,
                        setOutputContent,
                        addLog,
                        setIsLoading,
                      })
                    }
                    disabled={isLoading || hasNoSelection}
                    title={getActionTooltip(
                      'aiSummaries',
                      isLoading || hasNoSelection,
                      isLoading ? 'loading' : hasNoSelection ? 'noSelection' : null
                    )}
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Summarize
                  </button>

                  <button
                    className="w-32 px-3 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-500"
                    onClick={() =>
                      buildRefactorPromptAction({
                        rootItems,
                        selectedItems,
                        setOutputContent,
                        addLog,
                        setIsLoading,
                      })
                    }
                    disabled={isLoading || hasNoSelection}
                    title={getActionTooltip(
                      'refactorCode',
                      isLoading || hasNoSelection,
                      isLoading ? 'loading' : hasNoSelection ? 'noSelection' : null
                    )}
                  >
                    <Scissors className="w-4 h-4 mr-1" />
                    Refactor
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Generated Prompt */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-lg font-semibold">Generated Prompt</h2>
            <button
              onClick={() => handleManualCopy(outputContent)}
              className="flex items-center px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              title="Copy to clipboard"
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </button>
          </div>
          <textarea
            value={outputContent}
            onChange={(e) => setOutputContent(e.target.value)}
            className="flex-1 p-2 border rounded font-mono text-sm resize-none overflow-auto whitespace-pre"
            placeholder="Generated prompt to be pasted into an AI assistant will appear here..."
          />
        </div>
      </div>
    </div>
  );
};

export default ActionPanel;
