// AI Summary: Manages file change operations from AI output including CREATE, UPDATE, and DELETE.
// Handles both full file updates and diff-based changes with validation and error handling.
// Tracks operation state (accepted/rejected) and provides methods for applying/rejecting changes.
import { create } from 'zustand';
import { useLogStore } from './logStore';
import { FileOperation, FileOperationType } from '../types/global';

interface ApplyChangesState {
  activeOperations: FileOperation[];
  setOperations: (ops: FileOperation[]) => void;
  clearOperations: () => void;
  applyChange: (index: number) => Promise<void>;
  rejectChange: (index: number) => void;
  setChangeAppliedCallback: (callback: ((newlyCreatedPath?: string) => Promise<void>) | null) => void;
  diffMode: 'strict' | 'fuzzy';
  setDiffMode: (mode: 'strict' | 'fuzzy') => void;
}

export const useApplyChangesStore = create<ApplyChangesState>((set, get) => {
  let onChangeApplied: ((newlyCreatedPath?: string) => Promise<void>) | null = null;

  return {
    activeOperations: [],
    diffMode: 'strict', // Default to strict mode for more accurate changes

    setOperations: (ops: FileOperation[]) => {
      set({ activeOperations: ops });
    },

    clearOperations: () => {
      set({ activeOperations: [] });
    },

    setChangeAppliedCallback: (callback: ((newlyCreatedPath?: string) => Promise<void>) | null) => {
      onChangeApplied = callback;
    },

    setDiffMode: (mode: 'strict' | 'fuzzy') => {
      set({ diffMode: mode });
    },

    applyChange: async (index: number) => {
      const { activeOperations } = get();
      if (index < 0 || index >= activeOperations.length) return;

      const op = activeOperations[index];
      // If it's already accepted or rejected, do nothing
      if (op.accepted || op.rejected) {
        return;
      }

      const { addLog } = useLogStore.getState();
      try {
        // First mark as accepted to prevent duplicate operations
        const newOps = [...activeOperations];
        newOps[index] = { ...op, accepted: true };
        set({ activeOperations: newOps });

        // Normalize file path to use forward slashes
        const normalizedPath = op.file_path.replace(/\\/g, '/');
        // Remove leading slash if present to make path relative
        const relativePath = normalizedPath.startsWith('/')
          ? normalizedPath.slice(1)
          : normalizedPath;

        // Perform the file system operation
        switch (op.file_operation) {
          case 'CREATE':
          case 'UPDATE_FULL':
          case 'UPDATE_DIFF':
            try {
              await window.fileSystem.writeFile(relativePath, op.new_code);
              const operationVerb =
                op.file_operation === 'CREATE'
                  ? 'Created'
                  : op.file_operation === 'UPDATE_FULL'
                    ? 'Updated'
                    : 'Applied changes to';
              addLog(`${operationVerb} file: ${relativePath}`);

              // Additional validation for UPDATE_DIFF
              if (op.file_operation === 'UPDATE_DIFF') {
                try {
                  const newContent = await window.fileSystem.readFile(
                    relativePath,
                    { encoding: 'utf8' }
                  );
                  if (newContent !== op.new_code) {
                    throw new Error(
                      'File content verification failed after diff update'
                    );
                  }
                } catch (error) {
                  console.error('Verification error:', error);
                  addLog(
                    `Warning: Could not verify file content after update: ${error}`
                  );
                }
              }
            } catch (error) {
              // If operation fails, mark as not accepted and propagate error
              newOps[index] = { ...op, accepted: false };
              set({ activeOperations: newOps });
              throw error;
            }
            break;

          case 'DELETE':
            try {
              await window.fileSystem.deleteFile(relativePath);
              addLog(`Deleted file: ${relativePath}`);
            } catch (error) {
              // If operation fails, mark as not accepted and propagate error
              newOps[index] = { ...op, accepted: false };
              set({ activeOperations: newOps });
              throw error;
            }
            break;

          default:
            addLog(`Unknown operation: ${op.file_operation}`);
            // Mark operation as not accepted for unknown types
            newOps[index] = { ...op, accepted: false };
            set({ activeOperations: newOps });
            throw new Error(`Unsupported operation type: ${op.file_operation}`);
        }

        // Call the refresh callback after successful operation
        if (onChangeApplied) {
          try {
            // For CREATE operations, pass the file path to the callback
            if (op.file_operation === 'CREATE') {
              await onChangeApplied(relativePath);
            } else {
              await onChangeApplied();
            }
          } catch (error) {
            console.error('Error in change applied callback:', error);
            addLog('Warning: Post-operation refresh failed');
          }
        }
      } catch (error) {
        console.error(`Error applying change to ${op.file_path}:`, error);
        addLog(
          `Failed to ${op.file_operation.toLowerCase()} file ${op.file_path}: ${error}`
        );
        throw error; // Re-throw to let UI handle the error
      }
    },

    rejectChange: (index: number) => {
      const { activeOperations } = get();
      if (index < 0 || index >= activeOperations.length) return;

      const op = activeOperations[index];
      if (op.accepted || op.rejected) {
        return;
      }

      const newOps = [...activeOperations];
      newOps[index] = { ...op, rejected: true };
      set({ activeOperations: newOps });

      const { addLog } = useLogStore.getState();
      addLog(`Rejected operation for file: ${op.file_path}`);
    },
  };
});
