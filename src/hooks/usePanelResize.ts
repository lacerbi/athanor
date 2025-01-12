// AI Summary: Manages panel resize functionality with mouse event handling.
// Provides width state and event handlers for resizable panels.
import { useState, useEffect, useCallback, useRef } from 'react';

interface PanelResizeHook {
  leftPanelWidth: number;
  isResizing: boolean;
  resizeRef: React.RefObject<HTMLDivElement | null>;  // Update type to match useRef
  startResize: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function usePanelResize(
  minWidth = 150,
  maxWidth = 600,
  defaultWidth = 384
): PanelResizeHook {
  const [leftPanelWidth, setLeftPanelWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  const startResize = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleResize = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = Math.max(minWidth, Math.min(maxWidth, e.clientX));
        setLeftPanelWidth(newWidth);
      }
    };

    const stopResize = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', stopResize);
    }

    return () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResize);
    };
  }, [isResizing, minWidth, maxWidth]);

  return {
    leftPanelWidth,
    isResizing,
    resizeRef,
    startResize,
  };
}
