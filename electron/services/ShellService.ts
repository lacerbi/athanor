// AI Summary: Manages an optional, persistent pseudo-terminal (pty) process using `node-pty`. It gracefully handles cases where `node-pty` is not installed by disabling the CLI functionality. Provides methods to start, write to, resize, and kill the shell process, communicating with the renderer process via IPC.
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

  startShell(cols: number, rows: number): void {
    if (!this.isAvailable() || this.ptyProcess) return;

    const shell = os.platform() === 'win32' ? 'powershell.exe' : (process.env.SHELL || 'bash');
    this.ptyProcess = this.nodePtyModule.spawn(shell, [], {
      name: 'xterm-color',
      cols: cols || 80,
      rows: rows || 30,
      cwd: process.env.HOME,
      env: process.env,
    });

    this.ptyProcess.onData((data: string) => {
      mainWindow?.webContents.send('shell:data', data);
    });
    
    this.ptyProcess.onExit(() => {
        this.ptyProcess = null;
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
