// AI Summary: Manages application logs with functionality to add and retrieve log messages
import { create } from 'zustand';

interface LogState {
  logs: string[];
  addLog: (message: string) => void;
}

export const useLogStore = create<LogState>((set) => ({
  logs: [],
  addLog: (message: string) =>
    set((state) => ({
      logs: [...state.logs, `[${new Date().toLocaleTimeString()}] ${message}`],
    })),
}));
