// AI Summary: Manages workbench state including task description and output content.
// Provides initial welcome message and methods for updating text fields. Handles
// persistent state for the main workbench interface with proper cleanup.
import { create } from 'zustand';

interface WorkbenchState {
  taskDescription: string;
  outputContent: string;
  setTaskDescription: (text: string) => void;
  setOutputContent: (text: string) => void;
  resetTaskDescription: (text: string) => void;
  developerActionTrigger: number;
  triggerDeveloperAction: () => void;
  isGeneratingPrompt: boolean;
  setIsGeneratingPrompt: (isGenerating: boolean) => void;
  resetGeneratingPrompt: () => void;
}

const PROMPT_GENERATION_TIMEOUT = 30000; // 30 seconds timeout

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  taskDescription: '',
  outputContent:
    "Welcome to Athanor! 🚀\n\nI'm here to increase your productivity with AI coding assistants.\nTo get started:\n\n1. Write your task or question in the text area to the left\n2. Select relevant files from the file explorer\n3. Click one of the prompt generation buttons\n4. Paste the prompt into a AI assistant\n5. Copy the AI response to the clipboard\n6. Apply the AI Output above!\n\nLet's build something great together!",
  setTaskDescription: (text: string) => set({ taskDescription: text }),
  setOutputContent: (text: string) => set({ outputContent: text }),
  developerActionTrigger: 0,
  isGeneratingPrompt: false,
  setIsGeneratingPrompt: (isGenerating: boolean) =>
    set({ isGeneratingPrompt: isGenerating }),
  resetGeneratingPrompt: () => {
    set({ isGeneratingPrompt: false });
  },
  resetTaskDescription: (text: string) => {
    set({ 
      taskDescription: text,
      outputContent: '', // Clear output when task is reset
      developerActionTrigger: 0 // Reset trigger to avoid auto-generation
    });
  },
  triggerDeveloperAction: () => {
    const state = get();
    if (!state.isGeneratingPrompt) {
      // Set the generating flag and increment trigger
      set({
        developerActionTrigger: state.developerActionTrigger + 1,
        isGeneratingPrompt: true,
      });

      // Set up timeout safeguard
      setTimeout(() => {
        const currentState = get();
        if (currentState.isGeneratingPrompt) {
          console.warn('Prompt generation timeout - resetting state');
          set({ isGeneratingPrompt: false });
        }
      }, PROMPT_GENERATION_TIMEOUT);
    }
  },
}));
