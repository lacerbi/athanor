// AI Summary: Manages state for CLI sessions. It maps a project's current working directory (CWD) to a unique shell session ID, allowing the UI to persist and re-attach to the correct terminal process across component remounts.
import { create } from 'zustand';

interface CliState {
  sessions: Map<string, string>; // Map from cwd to sessionId
  getSessionId: (cwd: string) => string | undefined;
  setSessionId: (cwd: string, sessionId: string) => void;
  removeSession: (cwd: string) => void;
}

export const useCliStore = create<CliState>((set, get) => ({
  sessions: new Map(),

  getSessionId: (cwd: string) => {
    return get().sessions.get(cwd);
  },

  setSessionId: (cwd: string, sessionId: string) => {
    set((state) => ({
      sessions: new Map(state.sessions).set(cwd, sessionId),
    }));
  },

  removeSession: (cwd: string) => {
    set((state) => {
      const newSessions = new Map(state.sessions);
      newSessions.delete(cwd);
      return { sessions: newSessions };
    });
  },
}));
