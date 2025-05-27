// AI Summary: Main action panel component that coordinates prompt generation and file operations.
// Provides UI controls for task description, dynamic prompt generators, and preset tasks.
// Manages state for task inputs, generated prompts, and clipboard operations with contextual tooltips.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import TaskContextMenu from './action-panel/TaskContextMenu';
import {
  detectContexts,
  formatContext,
  isContextRelevant,
} from '../utils/contextDetection';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Copy,
  FileText,
  Scissors,
  Eraser,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Folder,
  FolderX,
  Code,
  FileText as MarkdownIcon,
  Info,
  FileQuestion,
} from 'lucide-react';
import PromptContextMenu from './action-panel/PromptContextMenu';
import type { PromptData, PromptVariant } from '../types/promptTypes';
import { useFileSystemStore } from '../stores/fileSystemStore';
import { useLogStore } from '../stores/logStore';
import { useWorkbenchStore } from '../stores/workbenchStore';
import { usePromptStore } from '../stores/promptStore';
import { buildDynamicPrompt } from '../utils/buildPrompt';
import { FileItem } from '../utils/fileTree';
import { copyToClipboard } from '../actions/ManualCopyAction';
import { buildTaskAction } from '../actions';
import { getActionTooltip, getTaskTooltip } from '../actions';
import { useTaskStore } from '../stores/taskStore';
import { useFileDrop } from '../hooks/useFileDrop';
import { useSettingsStore } from '../stores/settingsStore';
import { DRAG_DROP, DOC_FORMAT, SETTINGS } from '../utils/constants';
import type { ApplicationSettings } from '../types/global';
import SendViaApiControls from './action-panel/SendViaApiControls';

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

  const {
    tabs,
    activeTabIndex,
    createTab,
    removeTab,
    setActiveTab,
    setTabContent,
    setTabOutput,
    setTabContext,
    taskDescription, // Legacy support
    outputContent, // Legacy support
    setTaskDescription,
    setOutputContent,
    developerActionTrigger,
  } = useWorkbenchStore();

  // Detect contexts from current task
  const suggestedContexts = useMemo(() => {
    if (!tabs[activeTabIndex]?.content) return [];
    const detected = detectContexts(tabs[activeTabIndex].content);
    return detected
      .filter((ctx) => isContextRelevant(ctx, tabs[activeTabIndex].content))
      .map(formatContext);
  }, [tabs, activeTabIndex]);
  const [showContextDropdown, setShowContextDropdown] = useState(false);
  const contextFieldRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    promptId: string;
    x: number;
    y: number;
  } | null>(null);

  const [taskContextMenu, setTaskContextMenu] = useState<{
    taskId: string;
    x: number;
    y: number;
  } | null>(null);

  // Close context menus and dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      setContextMenu(null);
      setTaskContextMenu(null);
      if (
        contextFieldRef.current &&
        !contextFieldRef.current.contains(event.target as Node)
      ) {
        setShowContextDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Function to determine floating label position based on button position
  const getFloatingLabelPosition = (promptId: string) => {
    const buttonElement = document.querySelector(
      `button[data-prompt-id="${promptId}"]`
    );
    if (!buttonElement) return '';

    const rect = buttonElement.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Check if button is near the edges
    const positions: string[] = [];

    if (rect.top < 100) positions.push('top');
    if (rect.left < 100) positions.push('left');
    if (viewport.width - rect.right < 100) positions.push('right');

    return positions.join(' ');
  };

  // Handle Developer action trigger only when panel is active and a new trigger occurs
  const lastTriggerRef = useRef(developerActionTrigger);

  const {
    selectedItems,
    smartPreviewEnabled,
    toggleSmartPreview,
    includeFileTree,
    toggleFileTree,
    formatType,
    toggleFormatType,
    includeProjectInfo,
    toggleProjectInfo,
  } = useFileSystemStore();
  const { addLog } = useLogStore();
  const { prompts, getDefaultVariant, setActiveVariant, getActiveVariant } =
    usePromptStore();
  const { applicationSettings, saveApplicationSettings } = useSettingsStore();
  const { isGeneratingPrompt, setIsGeneratingPrompt } = useWorkbenchStore();

  // Handler for generating prompts
  const generatePrompt = async (prompt: PromptData, variant: PromptVariant) => {
    try {
      setIsLoading(true);
      setIsGeneratingPrompt(true);

      // Get smart preview configuration and threshold line length from application settings
      const appDefaults = SETTINGS.defaults.application;
      const smartPreviewConfig = {
        minLines:
          applicationSettings?.minSmartPreviewLines ??
          appDefaults.minSmartPreviewLines,
        maxLines:
          applicationSettings?.maxSmartPreviewLines ??
          appDefaults.maxSmartPreviewLines,
      };
      const currentThresholdLineLength =
        applicationSettings?.thresholdLineLength ??
        appDefaults.thresholdLineLength;

      const result = await buildDynamicPrompt(
        prompt,
        variant,
        rootItems,
        selectedItems,
        await window.fileSystem.getCurrentDirectory(),
        tabs[activeTabIndex].content, // Current tab's content
        tabs[activeTabIndex].context, // Current tab's context
        formatType, // Pass the current format type
        smartPreviewConfig, // Pass the smart preview configuration from settings
        currentThresholdLineLength // Pass the current threshold line length
      );
      setOutputContent(result);
      addLog(`Generated ${prompt.label} prompt`);
      await copyToClipboard({ content: result, addLog });
    } catch (error) {
      addLog(`Error generating prompt: ${error}`);
    } finally {
      setIsGeneratingPrompt(false);
      setIsLoading(false);
    }
  };

  const handleManualCopy = (content: string) => {
    void copyToClipboard({ content, addLog });
  };

  const isTaskEmpty =
    !tabs?.[activeTabIndex] || tabs[activeTabIndex].content.trim().length === 0;
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
              <div className="flex-1 flex items-center min-w-0">
                <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                  <div className="flex gap-1 min-w-0 items-center">
                    {tabs.map((tab, index) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(index)}
                        className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-t border-t border-x transition-colors whitespace-nowrap
                        ${
                          index === activeTabIndex
                            ? 'bg-white border-gray-300 text-gray-900 font-semibold'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <span className="truncate max-w-[120px]">
                          {tab.name}
                        </span>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTab(index);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                              removeTab(index);
                            }
                          }}
                          className="ml-1 p-0.5 hover:bg-gray-200 rounded cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-400"
                          title={tabs.length > 1 ? 'Close tab' : 'Clear tab'}
                        >
                          ×
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={() => createTab()}
                      className="flex items-center justify-center w-7 h-7 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                      title="New tab"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-none">
                <button
                  onClick={() => handleManualCopy(tabs[activeTabIndex].content)}
                  className="flex items-center px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </button>
              </div>
            </div>
            {/* Text Area */}
            <textarea
              className="flex-1 p-2 border rounded resize-none overflow-auto mb-2"
              placeholder="Describe your task or query here - whether it's implementing a feature, asking about the codebase, or discussing code improvements..."
              value={tabs[activeTabIndex].content}
              onChange={(e) => setTabContent(activeTabIndex, e.target.value)}
              {...useFileDrop({
                onInsert: (value, start, end) => {
                  const text = tabs[activeTabIndex].content;
                  const newText =
                    text.slice(0, start) + value + text.slice(end);
                  setTabContent(activeTabIndex, newText);
                },
                currentValue: tabs[activeTabIndex].content,
              })}
            />

            {/* Context Field */}
            <div className="relative" ref={contextFieldRef}>
              <div className="context-field relative">
                <span className="text-gray-500">Context:</span>
                <input
                  type="text"
                  placeholder="Add task context - leave empty in most cases"
                  value={tabs[activeTabIndex].context}
                  onChange={(e) =>
                    setTabContext(activeTabIndex, e.target.value)
                  }
                  className="flex-1"
                  aria-label="Task context"
                  {...useFileDrop({
                    onInsert: (value, start, end) => {
                      const text = tabs[activeTabIndex].context;
                      const newText =
                        text.slice(0, start) + value + text.slice(end);
                      setTabContext(activeTabIndex, newText);
                    },
                    currentValue: tabs[activeTabIndex].context,
                  })}
                />
                {tabs[activeTabIndex].context && (
                  <button
                    onClick={() => setTabContext(activeTabIndex, '')}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Clear context"
                  >
                    <Eraser className="w-4 h-4" />
                  </button>
                )}
                {suggestedContexts.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowContextDropdown(!showContextDropdown);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label={
                      showContextDropdown
                        ? 'Hide suggestions'
                        : 'Show suggestions'
                    }
                  >
                    {showContextDropdown ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              {/* Context Dropdown */}
              {showContextDropdown && suggestedContexts.length > 0 && (
                <div className="context-dropdown">
                  {suggestedContexts.map((context, index) => (
                    <div
                      key={index}
                      className={`context-dropdown-item ${
                        context === tabs[activeTabIndex].context ? 'active' : ''
                      }`}
                      onClick={() => {
                        setTabContext(activeTabIndex, context);
                        setShowContextDropdown(false);
                      }}
                    >
                      {context}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prompt Generators Section */}
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="pb-2 border-b flex justify-between items-center">
                  <h2 className="text-lg font-semibold">
                    Preset Prompts and Tasks
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleSmartPreview}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      title={
                        smartPreviewEnabled
                          ? 'Smart Preview: ON (click to disable)'
                          : 'Smart Preview: OFF (click to enable)'
                      }
                    >
                      {smartPreviewEnabled ? (
                        <Eye size={20} className="text-blue-600" />
                      ) : (
                        <EyeOff size={20} className="text-gray-600" />
                      )}
                    </button>
                    <button
                      onClick={toggleFileTree}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      title={
                        includeFileTree
                          ? 'Include File Tree: ON (click to disable)'
                          : 'Include File Tree: OFF (click to enable)'
                      }
                    >
                      {includeFileTree ? (
                        <Folder size={20} className="text-blue-600" />
                      ) : (
                        <FolderX size={20} className="text-gray-600" />
                      )}
                    </button>
                    <button
                      onClick={toggleProjectInfo}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      title={
                        includeProjectInfo
                          ? 'Include Project Info: ON (click to disable)'
                          : 'Include Project Info: OFF (click to enable)'
                      }
                    >
                      {includeProjectInfo ? (
                        <Info size={20} className="text-blue-600" />
                      ) : (
                        <FileQuestion size={20} className="text-gray-600" />
                      )}
                    </button>
                    <button
                      onClick={toggleFormatType}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      title={
                        formatType === DOC_FORMAT.XML
                          ? 'Format: XML Tags (click for Markdown)'
                          : 'Format: Markdown (click for XML Tags)'
                      }
                    >
                      {formatType === DOC_FORMAT.XML ? (
                        <Code size={20} className="text-blue-600" />
                      ) : (
                        <MarkdownIcon size={20} className="text-blue-600" />
                      )}
                    </button>
                  </div>
                </div>
                {/* Dynamic Prompts Row */}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-2 max-w-2xl mb-4">
                  {prompts.map((prompt) => {
                    const variant = getDefaultVariant(prompt.id);
                    if (!variant) return null;

                    const IconComponent = prompt.icon
                      ? (Icons as any)[prompt.icon]
                      : null;

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
                        disabled={isLoading || isGeneratingPrompt || isTaskEmpty}
                        data-edge={getFloatingLabelPosition(prompt.id)}
                        data-prompt-id={prompt.id}
                        aria-label={prompt.label}
                        aria-haspopup="true"
                        aria-expanded={
                          contextMenu?.promptId === prompt.id ? 'true' : 'false'
                        }
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

                {/* Dynamic Tasks Row */}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-2 max-w-2xl">
                  {useTaskStore((state) => state.tasks).map((task) => {
                    const IconComponent = task.icon
                      ? (Icons as any)[task.icon]
                      : null;
                    const isDisabled =
                      isLoading || isGeneratingPrompt ||
                      (task.requires === 'selected' && hasNoSelection);
                    const reason = isLoading
                      ? 'loading'
                      : hasNoSelection
                        ? 'noSelection'
                        : null;

                    return (
                      <button
                        key={task.id}
                        className="icon-btn bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-500"
                        title={getTaskTooltip(task, isDisabled, reason)}
                        onClick={() =>
                          buildTaskAction({
                            task,
                            rootItems,
                            selectedItems,
                            setOutputContent,
                            addLog,
                            setIsLoading,
                            currentThresholdLineLength:
                              applicationSettings?.thresholdLineLength ??
                              SETTINGS.defaults.application.thresholdLineLength,
                          })
                        }
                        disabled={isDisabled}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTaskContextMenu({
                            taskId: task.id,
                            x: e.clientX,
                            y: e.clientY,
                          });
                        }}
                        data-edge="left"
                        aria-label={task.label}
                        aria-haspopup="true"
                        aria-expanded={
                          taskContextMenu?.taskId === task.id ? 'true' : 'false'
                        }
                      >
                        {IconComponent && (
                          <>
                            <IconComponent className="w-5 h-5 icon-btn-icon" />
                            <span className="floating-label">{task.label}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Prompt Context Menu */}
        {contextMenu && (
          <PromptContextMenu
            prompt={prompts.find((p) => p.id === contextMenu.promptId)!}
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onSelectVariant={async (variantId: string) => {
              if (contextMenu?.promptId) {
                const prompt = prompts.find(
                  (p) => p.id === contextMenu.promptId
                );
                const variant = prompt?.variants.find(
                  (v) => v.id === variantId
                );

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
            activeVariantId={
              contextMenu?.promptId
                ? getActiveVariant(contextMenu.promptId)?.id
                : undefined
            }
          />
        )}

        {/* Task Context Menu */}
        {taskContextMenu && (
          <TaskContextMenu
            task={
              useTaskStore
                .getState()
                .tasks.find((t) => t.id === taskContextMenu.taskId)!
            }
            x={taskContextMenu.x}
            y={taskContextMenu.y}
            onClose={() => setTaskContextMenu(null)}
            onSelectVariant={(variantId: string) => {
              if (taskContextMenu?.taskId) {
                useTaskStore
                  .getState()
                  .setActiveVariant(taskContextMenu.taskId, variantId);
              }
              setTaskContextMenu(null);
            }}
            activeVariantId={
              taskContextMenu?.taskId
                ? useTaskStore
                    .getState()
                    .getActiveVariant(taskContextMenu.taskId)?.id
                : undefined
            }
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
            {...useFileDrop({
              onInsert: (value, start, end) => {
                const text = tabs[activeTabIndex].output;
                const newText = text.slice(0, start) + value + text.slice(end);
                setTabOutput(activeTabIndex, newText);
              },
              currentValue: tabs[activeTabIndex].output,
            })}
          />

          {/* Send via API Controls */}
          <SendViaApiControls
            isActive={isActive}
            outputContent={tabs[activeTabIndex].output}
            applicationSettings={applicationSettings}
            saveApplicationSettings={saveApplicationSettings}
            addLog={addLog}
            setActivePanelTab={setActivePanelTab}
            setParentIsLoading={setIsLoading}
            isSendingRequest={isGeneratingPrompt}
            setStoreIsGeneratingPrompt={setIsGeneratingPrompt}
          />
        </div>
      </div>
    </div>
  );
};

export default ActionPanel;
