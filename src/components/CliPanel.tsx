// AI Summary: Implements a terminal interface using xterm.js, rooted in the project directory. It connects to the persistent ShellService via IPC. On mount, it retrieves or creates a session ID from a global store, then attaches to that session. On unmount, it detaches, allowing the underlying shell process to persist.
import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css'; // Import xterm's CSS
import { useCliStore } from '../stores/cliStore';

interface CliPanelProps {
  currentDirectory: string;
  isVisible: boolean;
}

const CliPanel: React.FC<CliPanelProps> = ({ currentDirectory, isVisible }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<{ term: Terminal; fitAddon: FitAddon } | null>(
    null
  );
  const listenersAttached = useRef(false);

  // Effect to initialize the terminal once per project (due to key={currentDirectory})
  useEffect(() => {
    if (!terminalRef.current) return;
    console.log(`[CliPanel] Initializing terminal for ${currentDirectory}`);

    const term = new Terminal({ cursorBlink: true, convertEol: true });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    termInstanceRef.current = { term, fitAddon };
    term.open(terminalRef.current);

    // Add custom key event handler for copy/paste
    term.attachCustomKeyEventHandler((event) => {
      // Handle Ctrl+C (copy)
      if (event.ctrlKey && event.key === 'c' && term.hasSelection()) {
        navigator.clipboard.writeText(term.getSelection());
        return false; // Prevent default terminal behavior
      }
      // Handle Ctrl+V (paste)
      if (event.ctrlKey && event.key === 'v') {
        navigator.clipboard.readText().then((text) => {
          if (text) {
            // Send the pasted text to the terminal
            const sessionId = useCliStore
              .getState()
              .getSessionId(currentDirectory);
            if (sessionId) {
              window.electronBridge.shell.write(sessionId, text);
            }
          }
        });
        return false; // Prevent default terminal behavior
      }
      return true; // Let other keys pass through
    });

    (async () => {
      let sessionId = useCliStore.getState().getSessionId(currentDirectory);
      if (!sessionId) {
        sessionId = await window.electronBridge.shell.start(
          term.cols,
          term.rows,
          currentDirectory
        );
        useCliStore.getState().setSessionId(currentDirectory, sessionId);
      }

      window.electronBridge.shell.attach(sessionId);

      if (!listenersAttached.current) {
        term.onData((data) => {
          window.electronBridge.shell.write(sessionId, data);
        });
        term.onResize(({ cols, rows }) => {
          window.electronBridge.shell.resize(sessionId, cols, rows);
        });
        window.electronBridge.shell.onData((data) => {
          term.write(data);
        });
        listenersAttached.current = true;
      }
    })();

    // Return cleanup function for when the project changes (component unmounts)
    return () => {
      const sessionId = useCliStore.getState().getSessionId(currentDirectory);
      if (sessionId) {
        // We don't kill the shell here, that is handled by the lifecycle hook.
        // We just detach to stop receiving data.
        window.electronBridge.shell.detach(sessionId);
      }
      termInstanceRef.current?.term.dispose();
      termInstanceRef.current = null;
      listenersAttached.current = false;
    };
  }, [currentDirectory]);

  // Effect to handle the terminal becoming visible
  useEffect(() => {
    if (isVisible && termInstanceRef.current) {
      const { term, fitAddon } = termInstanceRef.current;
      // Use a timeout to ensure the DOM element is fully visible and has dimensions
      setTimeout(() => {
        fitAddon.fit();
        term.focus();
        // Force a redraw of the terminal's viewport. This is the key to fixing
        // rendering corruption from display:none.
        term.refresh(0, term.rows - 1);
      }, 50);
    }
  }, [isVisible]);

  return (
    <div
      ref={terminalRef}
      style={{ width: '100%', height: '100%', backgroundColor: 'black' }}
    />
  );
};

export default CliPanel;
