// AI Summary: Implements a terminal interface using xterm.js, rooted in the project directory. It connects to ShellService via IPC for process management and resizes automatically. A key prop based on currentDirectory ensures it resets on project change.
import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css'; // Import xterm's CSS

interface CliPanelProps {
  currentDirectory: string;
}

const CliPanel: React.FC<CliPanelProps> = ({ currentDirectory }) => {
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

      // Start backend process in the current project directory
      window.electronBridge.shell.start(term.cols, term.rows, currentDirectory);

      // Setup two-way communication
      term.onData((data) => window.electronBridge.shell.write(data));
      const cleanupOnData = window.electronBridge.shell.onData((data) =>
        term.write(data)
      );

      // Setup resize listener for window/panel resizing
      const resizeObserver = new ResizeObserver(() => {
        // This handles cases where the user resizes the whole window
        // or the panel divider.
        fitAddon.fit();
        window.electronBridge.shell.resize(term.cols, term.rows);
      });
      resizeObserver.observe(terminalRef.current);

      // Setup intersection observer for tab visibility changes
      const intersectionObserver = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            // When the panel becomes visible, call fit().
            // A small timeout here can still be a safeguard to ensure
            // CSS transitions are complete, but the observer itself
            // is the primary fix.
            setTimeout(() => fitAddon.fit(), 10);
          }
        },
        { threshold: 0.1 } // Fire when at least 10% of the element is visible
      );
      intersectionObserver.observe(terminalRef.current);

      // Return cleanup function
      return () => {
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        cleanupOnData();
        term.dispose();
        // Make sure to nullify the ref so the component can re-initialize
        // if the directory changes (which causes a re-mount).
        termInstanceRef.current = null;
      };
    }
  }, []); // Empty dependency array ensures this runs only once on mount, as component is re-keyed

  return (
    <div
      ref={terminalRef}
      style={{ width: '100%', height: '100%', backgroundColor: 'black' }}
    />
  );
};

export default CliPanel;
