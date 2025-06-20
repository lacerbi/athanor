// AI Summary: Manages workbench state including multi-tab task descriptions and outputs.
// Provides methods for tab management while maintaining backward compatibility with
// single-tab legacy code. Core features: tab creation/removal, content management,
// and active tab state tracking.
import { create } from 'zustand';
import { TaskTab, WorkbenchState } from '../types/global';
import { SETTINGS } from '../utils/constants';
import { getSelectableDescendants } from '../utils/fileSelection';
import { FileItem, getFileItemById } from '../utils/fileTree';

const PROMPT_GENERATION_TIMEOUT = 30000; // 30 seconds timeout

// Default welcome message for new tabs
const DEFAULT_WELCOME_MESSAGE =
  "Welcome to Athanor! ⚗️\n\nI'm here to increase your productivity with AI assistants.\nTo get started:\n\n1. Write your task or question in the text area to the left\n2. Select relevant files from the file explorer\n3. Click one of the prompt generation buttons\n4. Paste the prompt into a AI assistant\n5. Copy the AI response to the clipboard\n6. Apply the AI Output above!\n\nLet's build something great together!";

// Create a new task tab with smart numbering
function createTaskTab(existingTabs: TaskTab[], inheritedSelectedFiles: string[] = []): TaskTab {
  // Find the highest task number from existing tabs
  const taskRegex = /^Task (\d+)$/;
  let highestNumber = 0;

  existingTabs.forEach((tab) => {
    const match = tab.name.match(taskRegex);
    if (match) {
      const number = parseInt(match[1], 10);
      highestNumber = Math.max(highestNumber, number);
    }
  });

  // Use highest number + 1 for new tab
  const newNumber = highestNumber + 1;

  return {
    id: `tab-${Date.now().toString()}`,
    name: `Task ${newNumber}`,
    content: '',
    output: DEFAULT_WELCOME_MESSAGE,
    context: '',
    selectedFiles: [...inheritedSelectedFiles], // Inherit selection from previous tab
  };
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => {
  const store = {
    // Tab management state
    tabs: [createTaskTab([])], // Initialize with one tab
    activeTabIndex: 0,

    // Core tab management
    createTab: () =>
      set((state) => {
        // Inherit selected files from currently active tab
        const currentTab = state.tabs[state.activeTabIndex];
        const inheritedSelectedFiles = currentTab ? currentTab.selectedFiles : [];
        
        return {
          tabs: [...state.tabs, createTaskTab(state.tabs, inheritedSelectedFiles)],
          activeTabIndex: state.tabs.length,
        };
      }),

    removeTab: (index: number) =>
      set((state) => {
        if (state.tabs.length <= 1) {
          // If last tab is being closed, create a new "Task 1" tab
          return {
            tabs: [createTaskTab([], [])], // No inheritance for fresh start
            activeTabIndex: 0,
          };
        }
        return {
          tabs: state.tabs.filter((_, i) => i !== index),
          activeTabIndex: Math.min(index, state.tabs.length - 2),
        };
      }),

    setActiveTab: (index: number) => set({ activeTabIndex: index }),

    setTabContent: (index: number, text: string) =>
      set((state) => ({
        tabs: state.tabs.map((tab, i) =>
          i === index ? { ...tab, content: text } : tab
        ),
      })),

    setTabOutput: (index: number, text: string) =>
      set((state) => ({
        tabs: state.tabs.map((tab, i) =>
          i === index ? { ...tab, output: text } : tab
        ),
      })),

    setTabContext: (index: number, context: string) =>
      set((state) => ({
        tabs: state.tabs.map((tab, i) =>
          i === index ? { ...tab, context } : tab
        ),
      })),

    // Per-tab file selection management
    toggleFileSelection: (itemId: string, isFolder: boolean, fileTree: FileItem[]) =>
      set((state) => {
        const activeTab = state.tabs[state.activeTabIndex];
        if (!activeTab) return state;

        const currentSelection = new Set(activeTab.selectedFiles);
        let newSelection: string[];

        if (isFolder) {
          // Find the folder item in the file tree
          const folderItem = getFileItemById(itemId, fileTree);
          if (!folderItem) {
            // If we can't find the folder, fall back to simple toggle
            if (currentSelection.has(itemId)) {
              newSelection = activeTab.selectedFiles.filter(id => id !== itemId);
            } else {
              newSelection = [itemId, ...activeTab.selectedFiles.filter(id => id !== itemId)];
            }
          } else {
            // Get all selectable descendants of the folder
            const selectableIds = getSelectableDescendants(folderItem);
            
            const allSelected = selectableIds.every(id => currentSelection.has(id));
            
            if (allSelected) {
              // Remove all selectable descendants
              newSelection = activeTab.selectedFiles.filter(id => !selectableIds.includes(id));
            } else {
              // Add all unselected descendants to the beginning (highest priority)
              const newItems = selectableIds.filter(id => !currentSelection.has(id));
              const existingItems = activeTab.selectedFiles.filter(id => !newItems.includes(id));
              newSelection = [...newItems, ...existingItems];
            }
          }
        } else {
          // For files, simple toggle
          if (currentSelection.has(itemId)) {
            newSelection = activeTab.selectedFiles.filter(id => id !== itemId);
          } else {
            // Add to beginning of array (highest priority)
            newSelection = [itemId, ...activeTab.selectedFiles.filter(id => id !== itemId)];
          }
        }

        return {
          tabs: state.tabs.map((tab, i) =>
            i === state.activeTabIndex 
              ? { ...tab, selectedFiles: newSelection }
              : tab
          ),
        };
      }),

    removeFileFromSelection: (itemId: string) =>
      set((state) => {
        const activeTab = state.tabs[state.activeTabIndex];
        if (!activeTab) return state;

        return {
          tabs: state.tabs.map((tab, i) =>
            i === state.activeTabIndex
              ? { ...tab, selectedFiles: tab.selectedFiles.filter(id => id !== itemId) }
              : tab
          ),
        };
      }),

    clearFileSelection: () =>
      set((state) => {
        const activeTab = state.tabs[state.activeTabIndex];
        if (!activeTab) return state;

        return {
          tabs: state.tabs.map((tab, i) =>
            i === state.activeTabIndex
              ? { ...tab, selectedFiles: [] }
              : tab
          ),
        };
      }),

    reorderFileSelection: (sourceIndex: number, destinationIndex: number) =>
      set((state) => {
        const activeTab = state.tabs[state.activeTabIndex];
        if (!activeTab || sourceIndex === destinationIndex) return state;

        const newSelectedFiles = [...activeTab.selectedFiles];
        const [removed] = newSelectedFiles.splice(sourceIndex, 1);
        newSelectedFiles.splice(destinationIndex, 0, removed);

        return {
          tabs: state.tabs.map((tab, i) =>
            i === state.activeTabIndex
              ? { ...tab, selectedFiles: newSelectedFiles }
              : tab
          ),
        };
      }),

    resetTaskDescription: (text: string) => {
      const state = get();
      state.setTabContent(state.activeTabIndex, text);
      state.setTabOutput(state.activeTabIndex, '');
      state.setTabContext(state.activeTabIndex, '');
      set({ developerActionTrigger: 0 });
    },

    // Additional state
    developerActionTrigger: 0,
    isGeneratingPrompt: false,

    setIsGeneratingPrompt: (isGenerating: boolean) =>
      set({ isGeneratingPrompt: isGenerating }),

    resetGeneratingPrompt: () => {
      set({ isGeneratingPrompt: false });
    },

    triggerDeveloperAction: () => {
      const state = get();
      if (!state.isGeneratingPrompt) {
        set({
          developerActionTrigger: state.developerActionTrigger + 1,
          isGeneratingPrompt: true,
        });

        setTimeout(() => {
          const currentState = get();
          if (currentState.isGeneratingPrompt) {
            console.warn('Prompt generation timeout - resetting state');
            set({ isGeneratingPrompt: false });
          }
        }, PROMPT_GENERATION_TIMEOUT);
      }
    },

    // Get smart preview config for prompt generation
    getSmartPreviewConfig: () => {
      // Import settingsStore dynamically to avoid circular dependencies
      const { useSettingsStore } = require('./settingsStore');
      const { applicationSettings } = useSettingsStore.getState();

      return {
        minLines:
          applicationSettings?.minSmartPreviewLines ??
          SETTINGS.defaults.application.minSmartPreviewLines,
        maxLines:
          applicationSettings?.maxSmartPreviewLines ??
          SETTINGS.defaults.application.maxSmartPreviewLines,
      };
    },
  };

  return store;
});
