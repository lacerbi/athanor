// AI Summary: Manages workbench state including multi-tab task descriptions and outputs.
// Provides methods for tab management while maintaining backward compatibility with
// single-tab legacy code. Core features: tab creation/removal, content management,
// and active tab state tracking.
import { create } from 'zustand';
import { TaskTab, WorkbenchState } from '../types/global';
import { SETTINGS } from '../utils/constants';

const PROMPT_GENERATION_TIMEOUT = 30000; // 30 seconds timeout

// Default welcome message for new tabs
const DEFAULT_WELCOME_MESSAGE =
  "Welcome to Athanor! 🚀\n\nI'm here to increase your productivity with AI assistants.\nTo get started:\n\n1. Write your task or question in the text area to the left\n2. Select relevant files from the file explorer\n3. Click one of the prompt generation buttons\n4. Paste the prompt into a AI assistant\n5. Copy the AI response to the clipboard\n6. Apply the AI Output above!\n\nLet's build something great together!";

// Create a new task tab with smart numbering
function createTaskTab(existingTabs: TaskTab[]): TaskTab {
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
  };
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => {
  const store = {
    // Tab management state
    tabs: [createTaskTab([])], // Initialize with one tab
    activeTabIndex: 0,

    // Core tab management
    createTab: () =>
      set((state) => ({
        tabs: [...state.tabs, createTaskTab(state.tabs)],
        activeTabIndex: state.tabs.length,
      })),

    removeTab: (index: number) =>
      set((state) => {
        if (state.tabs.length <= 1) {
          // If last tab is being closed, create a new "Task 1" tab
          return {
            tabs: [createTaskTab([])],
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

    // Legacy support - getters
    get taskDescription() {
      return get().tabs[get().activeTabIndex]?.content ?? '';
    },

    get outputContent() {
      return get().tabs[get().activeTabIndex]?.output ?? '';
    },

    get taskContext() {
      return get().tabs[get().activeTabIndex]?.context ?? '';
    },

    // Legacy support - setters
    setTaskDescription: (text: string) => {
      const state = get();
      state.setTabContent(state.activeTabIndex, text);
    },

    setOutputContent: (text: string) => {
      const state = get();
      state.setTabOutput(state.activeTabIndex, text);
    },

    setTaskContext: (context: string) => {
      const state = get();
      state.setTabContext(state.activeTabIndex, context);
    },

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
