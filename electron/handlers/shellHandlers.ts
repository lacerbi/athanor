// AI Summary: Defines IPC handlers for shell-related operations. Exposes the ShellService to the renderer process, allowing it to check for availability, start, write to, and resize the pseudo-terminal.
import { ipcMain } from 'electron';
import type { ShellService } from '../services/ShellService';

export function setupShellHandlers(shellService: ShellService) {
  ipcMain.handle('shell:is-available', () => {
    return shellService.isAvailable();
  });

  ipcMain.on('shell:start', (_event, { cols, rows }: { cols: number, rows: number }) => {
    shellService.startShell(cols, rows);
  });

  ipcMain.on('shell:write', (_event, data: string) => {
    shellService.writeToShell(data);
  });
  
  ipcMain.on('shell:resize', (_event, { cols, rows }: { cols: number, rows: number }) => {
    shellService.resizeShell(cols, rows);
  });
}
