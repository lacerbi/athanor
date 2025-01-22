// AI Summary: Manages application logs with functionality to add and retrieve log messages.
// Supports clickable log entries with optional callbacks for interactive logging.
import { create } from 'zustand';

export interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  onClick?: () => void;
}

interface LogState {
  logs: LogEntry[];
  nextId: number;
  addLog: (messageOrEntry: string | Omit<LogEntry, 'id' | 'timestamp'>) => void;
}

export const useLogStore = create<LogState>((set) => ({
  logs: [],
  nextId: 1,
  addLog: (messageOrEntry) =>
    set((state) => {
      const timestamp = new Date().toLocaleTimeString();
      const nextId = state.nextId;

      const newEntry: LogEntry =
        typeof messageOrEntry === 'string'
          ? {
              id: nextId,
              timestamp,
              message: messageOrEntry,
            }
          : {
              id: nextId,
              timestamp,
              ...messageOrEntry,
            };

      return {
        logs: [...state.logs, newEntry],
        nextId: nextId + 1,
      };
    }),
}));
