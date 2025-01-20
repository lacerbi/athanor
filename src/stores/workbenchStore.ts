// AI Summary: Manages workbench state including multi-tab task descriptions and outputs.
// Provides methods for tab management while maintaining backward compatibility with
// single-tab legacy code. Core features: tab creation/removal, content management,
// and active tab state tracking.
import { create } from 'zustand';
import { TaskTab, WorkbenchState } from '../types/global';

const PROMPT_GENERATION_TIMEOUT = 30000; // 30 seconds timeout

// Default welcome message for new tabs
const DEFAULT_WELCOME_MESSAGE = "Welcome to Athanor! 🚀\n\nI'm here to increase your productivity with AI coding assistants.\nTo get started:\n\n1. Write your task or question in the text area to the left\n2. Select relevant files from the file explorer\n3. Click one of the prompt generation buttons\n4. Paste the prompt into a AI assistant\n5. Copy the AI response to the clipboard\n6. Apply the AI Output above!\n\nLet's build something great together!";

// Create a new task tab
function createTaskTab(tabNumber: number): TaskTab {
  return {
    id: `tab-${Date.now().toString()}`,
    name: `Task ${tabNumber.toString()}`,
    content: '',
    output: DEFAULT_WELCOME_MESSAGE,
    context: ''
  };
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => {
  const store = {
    // Tab management state
    tabs: [createTaskTab(1)], // Initialize with one tab
    activeTabIndex: 0,

    // Core tab management
    createTab: () => set((state) => ({
      tabs: [...state.tabs, createTaskTab(state.tabs.length + 1)],
      activeTabIndex: state.tabs.length,
    })),

    removeTab: (index: number) => set((state) => {
      if (state.tabs.length <= 1) {
        return {
          tabs: [createTaskTab(1)],
          activeTabIndex: 0,
        };
      }
      return {
        tabs: state.tabs.filter((_, i) => i !== index),
        activeTabIndex: Math.min(index, state.tabs.length - 2),
      };
    }),

    setActiveTab: (index: number) => set({ activeTabIndex: index }),

    setTabContent: (index: number, text: string) => set((state) => ({
      tabs: state.tabs.map((tab, i) => 
        i === index ? { ...tab, content: text } : tab
      ),
    })),

    setTabOutput: (index: number, text: string) => set((state) => ({
      tabs: state.tabs.map((tab, i) => 
        i === index ? { ...tab, output: text } : tab
      ),
    })),

    setTabContext: (index: number, context: string) => set((state) => ({
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
  };

  return store;
});