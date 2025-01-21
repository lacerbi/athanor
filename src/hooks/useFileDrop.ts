// AI Summary: Custom hook for handling file path drops on text inputs. Provides drag-over 
// and drop handlers with cursor position preservation and logging.
import { DragEvent } from 'react';
import { DRAG_DROP } from '../utils/constants';
import { useLogStore } from '../stores/logStore';

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
    console.log('Drop event path:', relativePath);

    try {
      const element = e.currentTarget;
      const start = element.selectionStart ?? 0;
      const end = element.selectionEnd ?? 0;
      
      if (relativePath) {
        console.log('Inserting path at', { start, end });
        onInsert(relativePath, start, end);
        
        // Restore cursor position after the inserted path
        setTimeout(() => {
          element.focus();
          element.setSelectionRange(
            start + relativePath.length,
            start + relativePath.length
          );
        }, 0);

        addLog(`Inserted path: ${relativePath}`);
      } else {
        // Try getting text data instead
        const textData = e.dataTransfer.getData('text');
        if (textData) {
          console.log('Got text data instead:', textData);
          onInsert(textData, start, end);
          
          setTimeout(() => {
            element.focus();
            element.setSelectionRange(
              start + textData.length,
              start + textData.length
            );
          }, 0);
          
          addLog(`Inserted text: ${textData}`);
        }
      }
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
