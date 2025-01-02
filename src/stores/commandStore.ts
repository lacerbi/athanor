// AI Summary: Manages clipboard content state and command validation with periodic updates.
// Handles both single and multiple command scenarios while maintaining backward compatibility.
import { create } from 'zustand';
import { parseCommand } from '../utils/commandParser';
import { Command } from '../utils/commandParser';

interface CommandState {
  clipboardContent: string | null;
  currentCommands: Command[] | null;
  setClipboardContent: (content: string | null) => void;
  hasValidCommands: boolean;
}

export const useCommandStore = create<CommandState>((set) => ({
  clipboardContent: null,
  currentCommands: null,
  hasValidCommands: false,
  setClipboardContent: (content: string | null) => {
    const commands = content ? parseCommand(content) : null;
    set({ 
      clipboardContent: content,
      currentCommands: commands,
      hasValidCommands: commands !== null && commands.length > 0
    });
  },
}));