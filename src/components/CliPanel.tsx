// AI Summary: Implements a fully functional terminal interface using xterm.js. It connects to the backend ShellService via IPC, handling terminal creation, data I/O, and automatic resizing to fit its container.
import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css'; // Import xterm's CSS

const CliPanel: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<{ term: Terminal; fitAddon: FitAddon } | null>(
    null
  );

  useEffect(() => {
    if (terminalRef.current && !termInstanceRef.current) {
      const term = new Terminal({ cursorBlink: true, convertEol: true });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      termInstanceRef.current = { term, fitAddon };
      term.open(terminalRef.current);
      fitAddon.fit();

      // Start backend process
      window.electronBridge.shell.start(term.cols, term.rows);

      // Setup two-way communication
      term.onData((data) => window.electronBridge.shell.write(data));
      const cleanupOnData = window.electronBridge.shell.onData((data) =>
        term.write(data)
      );

      // Setup resize listener
      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
        window.electronBridge.shell.resize(term.cols, term.rows);
      });
      resizeObserver.observe(terminalRef.current);

      // Return cleanup function
      return () => {
        resizeObserver.disconnect();
        cleanupOnData();
        term.dispose();
      };
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <div
      ref={terminalRef}
      style={{ width: '100%', height: '100%', backgroundColor: 'black' }}
    />
  );
};

export default CliPanel;
