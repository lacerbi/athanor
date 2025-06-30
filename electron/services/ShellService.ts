// AI Summary: Manages multiple, persistent pseudo-terminal (pty) sessions, keyed by a unique session ID. It handles cases where `node-pty` isn't installed. It supports a single "attached" UI, buffering output for detached sessions and replaying it on attach. Provides IPC-callable methods to start, write to, resize, attach, detach, and kill shell sessions.
import * as os from 'os';
import { randomUUID } from 'crypto';
import { spawn as spawn_child } from 'child_process';
import { mainWindow } from '../windowManager';

// Debug flag for shell diagnostics
const DEBUG_SHELL = false;

export class ShellService {
  private nodePtyModule: any = null;
  private ptySessions = new Map<
    string,
    { ptyProcess: any; buffer: string[] }
  >();
  private attachedSessionId: string | null = null;

  constructor() {
    try {
      // Conditionally require node-pty
      this.nodePtyModule = require('node-pty');
      console.log(
        '[ShellService] node-pty loaded successfully. CLI feature is enabled.'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[ShellService] node-pty failed to load, CLI feature will be disabled. Error: ${message}`
      );
      this.nodePtyModule = null;
    }
  }

  isAvailable = (): boolean => !!this.nodePtyModule;

  attach(sessionId: string) {
    if (!this.ptySessions.has(sessionId)) {
      console.warn(
        `[ShellService] Attempted to attach to non-existent shell session: ${sessionId}`
      );
      return;
    }
    console.log(`[ShellService] Attaching to shell session: ${sessionId}`);
    this.attachedSessionId = sessionId;
    const session = this.ptySessions.get(sessionId)!;
    if (session.buffer.length > 0) {
      const data = session.buffer.join('');
      session.buffer = [];
      mainWindow?.webContents.send('shell:data', data);
    }
  }

  detach(sessionId: string) {
    if (this.attachedSessionId === sessionId) {
      console.log(`[ShellService] Detaching from shell session: ${sessionId}`);
      this.attachedSessionId = null;
    }
  }

  startShell(options: { cols: number; rows: number; cwd: string }): string {
    if (!this.isAvailable()) return '';

    const sessionId = randomUUID();
    let shell: string;

    if (os.platform() === 'win32') {
      shell = 'powershell.exe';
    } else {
      // On macOS/Linux, prefer the user's default shell if available.
      // Fall back to a known, absolute path for macOS to avoid PATH issues.
      // Modern macOS (Catalina+) defaults to /bin/zsh.
      shell =
        process.env.SHELL || (os.platform() === 'darwin' ? '/bin/zsh' : 'bash');
    }

    console.log(
      `[ShellService] Attempting to spawn shell: "${shell}" with CWD: "${options.cwd || os.homedir()}"`
    );
    console.log(`[ShellService] Current process PATH: ${process.env.PATH}`);

    // --- DIAGNOSTIC CODE START ---
    if (DEBUG_SHELL) {
      try {
        console.log(
          '[ShellService] DIAGNOSTIC: Testing with Node child_process.spawn...'
        );
        const testProcess = spawn_child(shell, [], {
          cwd: options.cwd || os.homedir(),
          env: process.env,
          detached: true, // Important for a simple test
        });

        testProcess.on('error', (err) => {
          console.error(
            '[ShellService] DIAGNOSTIC: child_process.spawn FAILED!',
            err
          );
        });

        testProcess.on('spawn', () => {
          console.log(
            '[ShellService] DIAGNOSTIC: child_process.spawn SUCCEEDED.'
          );
          testProcess.kill(); // We don't need it to keep running
        });
      } catch (e) {
        console.error(
          '[ShellService] DIAGNOSTIC: child_process.spawn THREW AN ERROR!',
          e
        );
      }
    }
    // --- DIAGNOSTIC CODE END ---

    try {
      const ptyProcess = this.nodePtyModule.spawn(shell, [], {
        name: 'xterm-color',
        cols: options.cols || 80,
        rows: options.rows || 30,
        cwd: options.cwd || os.homedir(),
        env: process.env,
      });

      const session = { ptyProcess, buffer: [] };
      this.ptySessions.set(sessionId, session);
      console.log(`[ShellService] Started new shell session: ${sessionId}`);

      ptyProcess.onData((data: string) => {
        const currentSession = this.ptySessions.get(sessionId);
        if (this.attachedSessionId === sessionId) {
          mainWindow?.webContents.send('shell:data', data);
        } else if (currentSession) {
          currentSession.buffer.push(data);
        }
      });

      ptyProcess.onExit(() => {
        console.log(`[ShellService] Shell session exited: ${sessionId}`);
        this.ptySessions.delete(sessionId);
        if (this.attachedSessionId === sessionId) {
          this.attachedSessionId = null;
        }
        mainWindow?.webContents.send('shell:exit', sessionId);
      });

      return sessionId;
    } catch (error) {
      // Type-safe error handling
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      // Node.js errors often have additional properties
      const nodeError = error as NodeJS.ErrnoException;

      const errorDetails = {
        message: errorMessage,
        stack: errorStack,
        errno: nodeError.errno,
        code: nodeError.code,
        syscall: nodeError.syscall,
        path: nodeError.path,
        // Safely extract any other properties
        raw: error,
      };

      console.error('[ShellService] DETAILED ERROR:', errorDetails);

      // Also log what we were trying to do
      console.error('[ShellService] Attempted spawn with:', {
        shell: shell,
        args: [],
        options: {
          name: 'xterm-color',
          cols: options.cols || 80,
          rows: options.rows || 30,
          cwd: options.cwd || os.homedir(),
          env: Object.keys(process.env).length + ' env vars',
        },
      });

      // Try to provide helpful context based on error code
      if (nodeError.code === 'EACCES') {
        console.error(
          '[ShellService] EACCES: Permission denied. This usually means file permissions.'
        );
      } else if (nodeError.code === 'EPERM') {
        console.error(
          '[ShellService] EPERM: Operation not permitted. This is usually a security policy issue.'
        );
      } else if (nodeError.code === 'ENOENT') {
        console.error(
          '[ShellService] ENOENT: File not found. Shell binary might not exist.'
        );
      }

      mainWindow?.webContents.send('shell:error', {
        error: errorMessage,
        code: nodeError.code,
        errno: nodeError.errno,
      });
      return '';
    }
  }

  writeToShell(sessionId: string, data: string): void {
    if (!this.isAvailable() || !this.ptySessions.has(sessionId)) return;
    this.ptySessions.get(sessionId)?.ptyProcess.write(data);
  }

  resizeShell(sessionId: string, cols: number, rows: number): void {
    if (!this.isAvailable() || !this.ptySessions.has(sessionId)) return;
    this.ptySessions.get(sessionId)?.ptyProcess.resize(cols, rows);
  }

  killShell(sessionId: string): void {
    if (!this.isAvailable()) return;
    const session = this.ptySessions.get(sessionId);
    if (session) {
      console.log(`[ShellService] Killed shell session: ${sessionId}`);
      session.ptyProcess.kill();
      // onExit handler will clean up the session from the map
    }
  }

  killAllShells(): void {
    if (!this.isAvailable()) return;
    console.log('[ShellService] Killing all active shell sessions.');
    for (const session of this.ptySessions.values()) {
      session.ptyProcess.kill();
    }
    this.ptySessions.clear();
  }
}
