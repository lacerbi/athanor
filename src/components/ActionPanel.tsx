// AI Summary: Main action panel component that coordinates prompt generation and file operations.
// Provides UI controls for task description, dynamic prompt generators, and preset tasks.
// Manages state for task inputs, generated prompts, and clipboard operations with contextual tooltips.
import React, { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Copy, FileText, Scissors, Eraser } from 'lucide-react';
import PromptContextMenu from './PromptContextMenu';
import type { PromptData, PromptVariant } from '../types/promptTypes';
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
  setActivePanelTab?: (tab: 'workbench' | 'viewer' | 'apply-changes') => void;
  isActive: boolean;
}

const ActionPanel: React.FC<ActionPanelProps> = ({
  rootItems,
  setActivePanelTab,
  isActive,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    promptId: string;
    x: number;
    y: number;
  } | null>(null);
  
  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  
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
    tabs,
    activeTabIndex,
    createTab,
    removeTab,
    setActiveTab,
    setTabContent,
    setTabOutput,
    taskDescription, // Legacy support
    outputContent,   // Legacy support
    setTaskDescription,
    setOutputContent,
    developerActionTrigger,
  } = useWorkbenchStore();

  // Handle Developer action trigger only when panel is active and a new trigger occurs
  const lastTriggerRef = useRef(developerActionTrigger);
  
  const { selectedItems } = useFileSystemStore();
  const { addLog } = useLogStore();
  const { prompts, getDefaultVariant, setActiveVariant, getActiveVariant } = usePromptStore();

  // Handler for generating prompts
  const generatePrompt = async (prompt: PromptData, variant: PromptVariant) => {
    try {
      setIsLoading(true);
      const result = await buildDynamicPrompt(
        prompt,
        variant,
        rootItems,
        selectedItems,
        await window.fileSystem.getCurrentDirectory(),
        tabs[activeTabIndex].content // Use current tab's content instead of legacy taskDescription
      );
      setOutputContent(result);
      addLog(`Generated ${prompt.label} prompt`);
      await copyToClipboard({ content: result, addLog });
    } catch (error) {
      addLog(`Error generating prompt: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualCopy = (content: string) => {
    void copyToClipboard({ content, addLog });
  };

  const isTaskEmpty = !tabs?.[activeTabIndex] || tabs[activeTabIndex].content.trim().length === 0;
  const hasNoSelection = selectedItems.size === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Main Content Area with Two Columns */}
      <div className="flex flex-1 gap-6 min-h-0">
        {/* Left Column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Task Description Section with Tabs */}
          <div className="flex flex-col flex-1 min-h-0">
            {/* Tab Bar */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 flex items-center overflow-x-auto no-scrollbar">
                <div className="flex gap-1 min-w-0">
                  {tabs.map((tab, index) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(index)}
                      className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-t border-t border-x transition-colors whitespace-nowrap
                        ${index === activeTabIndex 
                          ? 'bg-white border-gray-300 text-gray-900 font-semibold' 
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                    >
                      <span className="truncate max-w-[120px]">{tab.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTab(index);
                        }}
                        className="ml-1 p-0.5 hover:bg-gray-200 rounded"
                        title={tabs.length > 1 ? "Close tab" : "Clear tab"}
                      >
                        ×
                      </button>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => createTab()}
                  className="flex items-center justify-center w-7 h-7 ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                  title="New tab"
                >
                  +
                </button>
              </div>
              <button
                onClick={() => handleManualCopy(tabs[activeTabIndex].content)}
                className="flex items-center px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                title="Copy to clipboard"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </button>
            </div>
            {/* Text Area */}
            <textarea
              className="flex-1 p-2 border rounded resize-none overflow-auto mb-4"
              placeholder="Describe your task here - whether it's implementing a feature, asking about the codebase, or discussing code improvements..."
              value={tabs[activeTabIndex].content}
              onChange={(e) => setTabContent(activeTabIndex, e.target.value)}
            />

            {/* Prompt Generators Section */}
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="pb-2 border-b">
                  <h2 className="text-lg font-semibold">Preset Prompts and Tasks</h2>
                </div>
                {/* Dynamic Prompts Row */}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-2 max-w-2xl mb-4">
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
                          if (isLoading || isTaskEmpty) return;
                          await generatePrompt(prompt, variant);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setContextMenu({
                            promptId: prompt.id,
                            x: e.clientX,
                            y: e.clientY,
                          });
                        }}
                        disabled={isLoading || isTaskEmpty}
                        data-edge={getFloatingLabelPosition(prompt.id)}
                        data-prompt-id={prompt.id}
                        aria-label={prompt.label}
                        aria-haspopup="true"
                        aria-expanded={contextMenu?.promptId === prompt.id ? 'true' : 'false'}
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

                {/* Preset Tasks Row */}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-2 max-w-2xl">
                  <button
                    className="icon-btn bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-500"
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
                    className="icon-btn bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-teal-500"
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

        {/* Prompt Context Menu */}
        {contextMenu && (
          <PromptContextMenu
            prompt={prompts.find(p => p.id === contextMenu.promptId)!}
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onSelectVariant={async (variantId: string) => {
              if (contextMenu?.promptId) {
                const prompt = prompts.find(p => p.id === contextMenu.promptId);
                const variant = prompt?.variants.find(v => v.id === variantId);
                
                if (prompt && variant) {
                  setActiveVariant(contextMenu.promptId, variantId);
                  
                  // Only trigger prompt generation if the button is not disabled
                  if (!isLoading && !isTaskEmpty) {
                    await generatePrompt(prompt, variant);
                  }
                }
              }
              setContextMenu(null);
            }}
            activeVariantId={contextMenu?.promptId ? getActiveVariant(contextMenu.promptId)?.id : undefined}
          />
        )}

        {/* Right Column - Generated Prompt */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-lg font-semibold">Generated Prompt</h2>
            <button
              onClick={() => handleManualCopy(tabs[activeTabIndex].output)}
              className="flex items-center px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              title="Copy to clipboard"
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </button>
          </div>
          <textarea
            value={tabs[activeTabIndex].output}
            onChange={(e) => setTabOutput(activeTabIndex, e.target.value)}
            className="flex-1 p-2 border rounded font-mono text-sm resize-none overflow-auto whitespace-pre"
            placeholder="Generated prompt to be pasted into an AI assistant will appear here..."
          />
        </div>
      </div>
    </div>
  );
};

export default ActionPanel;
