// AI Summary: Main action panel component that coordinates prompt generation and file operations.
// Provides UI controls for task description, dynamic prompt generators, and preset tasks.
// Manages state for task inputs, generated prompts, and clipboard operations with contextual tooltips.
import React, { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Copy, FileText, Scissors, Eraser } from 'lucide-react';
import { useFileSystemStore } from '../stores/fileSystemStore';
import { useLogStore } from '../stores/logStore';
import { useWorkbenchStore } from '../stores/workbenchStore';
import { usePromptStore } from '../stores/promptStore';
import { buildDynamicPrompt } from '../utils/buildPrompt';
import { FileItem } from '../utils/fileTree';
import { copyToClipboard } from '../actions/ManualCopyAction';
import { buildAiSummaryPromptAction } from '../actions/BuildAiSummaryAction';
import { buildRefactorPromptAction } from '../actions/BuildRefactorAction';
import { getActionTooltip } from '../actions';

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
  
  // Function to determine floating label position based on button position
  const getFloatingLabelPosition = (promptId: string) => {
    const buttonElement = document.querySelector(`button[data-prompt-id="${promptId}"]`);
    if (!buttonElement) return '';

    const rect = buttonElement.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Check if button is near the edges
    const positions: string[] = [];
    
    if (rect.top < 100) positions.push('top');
    if (rect.left < 100) positions.push('left');
    if (viewport.width - rect.right < 100) positions.push('right');
    
    return positions.join(' ');
  };

  const {
    taskDescription,
    outputContent,
    setTaskDescription,
    setOutputContent,
    developerActionTrigger,
  } = useWorkbenchStore();

  // Handle Developer action trigger only when panel is active and a new trigger occurs
  const lastTriggerRef = useRef(developerActionTrigger);
  
  const { selectedItems } = useFileSystemStore();
  const { addLog } = useLogStore();
  const { prompts, getDefaultVariant } = usePromptStore();

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
              {/* Dynamic Prompt Generators */}
              <div className="space-y-3">
                <div className="pb-2 border-b">
                  <h2 className="text-lg font-semibold">Dynamic Prompts</h2>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-2 max-w-2xl">
                  {prompts.map((prompt) => {
                    const variant = getDefaultVariant(prompt.id);
                    if (!variant) return null;
                    
                    const IconComponent = prompt.icon ? (Icons as any)[prompt.icon] : null;

                    return (
                      <button
                        key={prompt.id}
                        className="icon-btn bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
                        title={prompt.tooltip || prompt.label}
                        onClick={async () => {
                          try {
                            setIsLoading(true);
                            const result = await buildDynamicPrompt(
                              prompt,
                              variant,
                              rootItems,
                              selectedItems,
                              await window.fileSystem.getCurrentDirectory(),
                              taskDescription
                            );
                            setOutputContent(result);
                            addLog(`Generated ${prompt.label} prompt`);
                            await copyToClipboard({ content: result, addLog });
                          } catch (error) {
                            addLog(`Error generating prompt: ${error}`);
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        disabled={isLoading || isTaskEmpty}
                        data-edge={getFloatingLabelPosition(prompt.id)}
                        data-prompt-id={prompt.id}
                        aria-label={prompt.label}
                      >
                        {IconComponent && (
                          <>
                            <IconComponent className="w-5 h-5 icon-btn-icon" />
                            <span className="floating-label">
                              {prompt.label}
                            </span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* File-Based Generators */}
              <div className="space-y-3">
                <div className="pb-2 border-b">
                  <h2 className="text-lg font-semibold">Load Preset Task</h2>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-2 max-w-2xl">
                  <button
                    className="icon-btn bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-purple-500"
                    title={getActionTooltip(
                      'aiSummaries',
                      isLoading || hasNoSelection,
                      isLoading ? 'loading' : hasNoSelection ? 'noSelection' : null
                    )}
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
                    data-edge="left"
                    aria-label="Summarize files"
                  >
                    <>
                      <FileText className="w-5 h-5 icon-btn-icon" />
                      <span className="floating-label">
                        AI Summaries
                      </span>
                    </>
                  </button>

                  <button
                    className="icon-btn bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-500"
                    title={getActionTooltip(
                      'refactorCode',
                      isLoading || hasNoSelection,
                      isLoading ? 'loading' : hasNoSelection ? 'noSelection' : null
                    )}
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
                    data-edge="left"
                    aria-label="Refactor files"
                  >
                    <>
                      <Scissors className="w-5 h-5 icon-btn-icon" />
                      <span className="floating-label">
                        Refactor Code
                      </span>
                    </>
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
