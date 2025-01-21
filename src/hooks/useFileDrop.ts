// AI Summary: Custom hook for handling file path drops on text inputs. Provides drag-over 
// and drop handlers with cursor position preservation and logging.
import { DragEvent } from 'react';
import { DRAG_DROP } from '../utils/constants';
import { useLogStore } from '../stores/logStore';

// Helper function to get text position from coordinates in a textarea
function getTextareaPositionFromCoords(
  textarea: HTMLTextAreaElement,
  x: number,
  y: number
): number | null {
  // Create a copy of the textarea to measure text positions
  const mirror = document.createElement('div');
  const style = window.getComputedStyle(textarea);
  
  // Copy all styles that affect text layout
  const stylesToCopy = [
    'box-sizing', 'width', 'height', 'padding', 'border', 'font-family',
    'font-size', 'font-weight', 'line-height', 'white-space', 'word-break',
    'overflow-wrap', 'tab-size', 'text-indent'
  ];
  
  stylesToCopy.forEach(key => {
    mirror.style.setProperty(key, style.getPropertyValue(key));
  });
  
  // Set specific styles needed for measurement
  mirror.style.position = 'absolute';
  mirror.style.top = '0';
  mirror.style.left = '0';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.overflow = 'auto';
  
  // Get text content and current scroll position
  const content = textarea.value;
  const scrollTop = textarea.scrollTop;
  
  // Create text nodes for measurement
  const text = document.createTextNode(content);
  mirror.appendChild(text);
  document.body.appendChild(mirror);
  
  try {
    const range = document.createRange();
    let pos = 0;
    const lineHeight = parseFloat(style.lineHeight);
    const paddingTop = parseFloat(style.paddingTop);
    
    // Adjust y coordinate for scroll position
    const adjustedY = y + scrollTop - paddingTop;
    const lineIndex = Math.floor(adjustedY / lineHeight);
    
    // Find the line where the drop occurred
    const lines = content.split('\n');
    let currentLine = 0;
    let currentPos = 0;
    
    for (let i = 0; i < lines.length; i++) {
      if (currentLine >= lineIndex) {
        // Create a range for each character in the line to find the closest one
        const line = lines[i];
        for (let j = 0; j <= line.length; j++) {
          const tempRange = document.createRange();
          const textNode = mirror.firstChild as Text;
          tempRange.setStart(textNode, currentPos + j);
          tempRange.setEnd(textNode, currentPos + j);
          const rect = tempRange.getBoundingClientRect();
          
          if (rect.left >= x) {
            pos = currentPos + j;
            break;
          }
          if (j === line.length) {
            pos = currentPos + j;
          }
        }
        break;
      }
      currentLine++;
      currentPos += lines[i].length + 1; // +1 for the newline
    }
    
    return pos;
  } finally {
    document.body.removeChild(mirror);
  }
}

interface UseFileDropParams {
  onInsert: (value: string, start: number, end: number) => void;
  currentValue: string;
}

export function useFileDrop({ onInsert, currentValue }: UseFileDropParams) {
  const { addLog } = useLogStore();

  const handleDragEnter = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragOver = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Get the path from text/plain
    const relativePath = e.dataTransfer.getData('text/plain');
    if (!relativePath) return;

    try {
      const element = e.currentTarget;
      
      // Get position from drop coordinates
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      let insertPosition: number;
      const textLength = element.value.length;
      
      // Calculate insert position based on element type
      if (element instanceof HTMLTextAreaElement) {
        // For textareas, handle positioning
        const totalHeight = element.scrollHeight;
        const lastLine = element.value.split('\n').length;
        const lineHeight = totalHeight / Math.max(lastLine, 1);
        
        // If drop is below last line or in empty area, append to end
        if (y > lastLine * lineHeight || element.value.trim() === '') {
          insertPosition = textLength;
        } else {
          // Try to get precise position
          const position = getTextareaPositionFromCoords(element, x, y);
          insertPosition = (position !== null && position <= textLength) ? position : textLength;
        }
      } else {
        // For inputs, use current cursor position or end if out of bounds
        const cursorPos = element.selectionStart ?? 0;
        insertPosition = cursorPos > textLength ? textLength : cursorPos;
      }
      
      // Insert the path at calculated position
      onInsert(relativePath, insertPosition, insertPosition);
      
      // Restore cursor position after the inserted path
      setTimeout(() => {
        element.focus();
        element.setSelectionRange(
          insertPosition + relativePath.length,
          insertPosition + relativePath.length
        );
      }, 0);

      addLog(`Inserted path: ${relativePath}`);
    } catch (error) {
      console.error('Error handling file drop:', error);
      addLog('Failed to insert file path');
    }
  };

  // Return all required drag and drop event handlers
  return {
    onDragEnter: handleDragEnter,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop
  };
}
