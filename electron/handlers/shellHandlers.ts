// AI Summary: Defines IPC handlers for all shell-related functionality. It connects renderer process requests (like starting, writing to, or attaching to a shell) to the corresponding methods in the ShellService, enabling persistent, multi-session terminal management using unique session IDs.
import { ipcMain } from 'electron';
import { ShellService } from '../services/ShellService';

export function setupShellHandlers(shellService: ShellService) {
  ipcMain.handle('shell:is-available', () => {
    return shellService.isAvailable();
  });

  ipcMain.handle(
    'shell:start',
    (_, options: { cols: number; rows: number; cwd: string }) => {
      return shellService.startShell(options);
    }
  );

  ipcMain.on('shell:attach', (_, sessionId: string) => {
    shellService.attach(sessionId);
  });

  ipcMain.on('shell:detach', (_, sessionId: string) => {
    shellService.detach(sessionId);
  });

  ipcMain.on(
    'shell:write',
    (_, { sessionId, data }: { sessionId: string; data: string }) => {
      shellService.writeToShell(sessionId, data);
    }
  );

  ipcMain.on(
    'shell:resize',
    (
      _,
      { sessionId, cols, rows }: { sessionId: string; cols: number; rows: number }
    ) => {
      shellService.resizeShell(sessionId, cols, rows);
    }
  );

  ipcMain.on('shell:kill', (_, sessionId: string) => {
    shellService.killShell(sessionId);
  });
}
