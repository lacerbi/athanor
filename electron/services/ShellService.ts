// AI Summary: Manages an optional, persistent pseudo-terminal (pty) process using `node-pty`. It gracefully handles cases where `node-pty` is not installed. Provides methods to start (in a specified directory), write to, resize, and kill the shell process, communicating with the renderer process via IPC. The start method includes logic to prevent race conditions when restarting the shell.
import * as os from 'os';
import { mainWindow } from '../windowManager';

export class ShellService {
  private nodePtyModule: any = null;
  private ptyProcess: any | null = null;

  constructor() {
    try {
      // Conditionally require node-pty
      this.nodePtyModule = require('node-pty');
      console.log('[ShellService] node-pty loaded successfully. CLI feature is enabled.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[ShellService] node-pty failed to load, CLI feature will be disabled. Error: ${message}`);
      this.nodePtyModule = null;
    }
  }

  isAvailable = (): boolean => !!this.nodePtyModule;

  startShell(options: { cols: number; rows: number; cwd?: string }): void {
    if (!this.isAvailable()) return;

    // If a pty process already exists, kill it before starting a new one.
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      // We don't set this.ptyProcess to null here, to prevent a race condition
      // where the old process's onExit handler nullifies the new process.
    }

    const shell = os.platform() === 'win32' ? 'powershell.exe' : (process.env.SHELL || 'bash');
    const ptyProcess = this.nodePtyModule.spawn(shell, [], {
      name: 'xterm-color',
      cols: options.cols || 80,
      rows: options.rows || 30,
      cwd: options.cwd || os.homedir(),
      env: process.env,
    });

    this.ptyProcess = ptyProcess;

    ptyProcess.onData((data: string) => {
      mainWindow?.webContents.send('shell:data', data);
    });
    
    ptyProcess.onExit(() => {
      // Only nullify the process if the exiting process is the current one.
      // This prevents an old onExit handler from nullifying a new process.
      if (this.ptyProcess === ptyProcess) {
        this.ptyProcess = null;
      }
    });
  }

  writeToShell(data: string): void {
    if (!this.isAvailable() || !this.ptyProcess) return;
    this.ptyProcess.write(data);
  }

  resizeShell(cols: number, rows: number): void {
    if (!this.isAvailable() || !this.ptyProcess) return;
    this.ptyProcess.resize(cols, rows);
  }

  killShell(): void {
    if (!this.isAvailable() || !this.ptyProcess) return;
    this.ptyProcess.kill();
    this.ptyProcess = null;
  }
}
