# Feature: Extend "Apply Changes" Panel To Git Diff Review

## Introduction: The Existing "Apply Changes" Functionality

Before we begin, it's important to understand the system we'll be modifying. The **"Apply Changes"** tab is a core Athanor feature designed to safely bridge the gap between AI code generation and your local file system.

Its current workflow is entirely centered around AI interaction:

1.  **AI Response as Input:** A user generates code with an AI assistant (like ChatGPT, Claude, etc.) using a prompt created by Athanor. The AI's response is formatted with special XML-like tags.
2.  **Parsing Custom Commands:** When the user pastes this response back into Athanor, the application scans for an `<ath command="apply changes">...</ath>` block. This block contains one or more `<file>` operations that describe what to create, delete, or update. The logic for this parsing lives in `src/commands/parser/applyChangesParser.ts`.
3.  **Visual Diff Review:** The parsed file operations are then sent to the `applyChangesStore`, a state manager dedicated to this feature. The `ApplyChangesPanel.tsx` component subscribes to this store and renders each operation as an interactive diff view, showing exactly what code will be added or removed.
4.  **User Action:** For each diff, the user has two choices:
    - **Accept:** This writes the proposed changes to the actual file on disk.
    - **Reject:** This simply dismisses the suggestion from the UI.

This feature provides a critical safety layer, ensuring the user is in full control and can verify every change before it affects their project.

Our goal is to **repurpose this powerful diffing and review UI** for a second use case: viewing local Git changes. Instead of populating the panel from an AI's XML response, in this usage case we will populate it by comparing the current state of files against the last Git commit. (The panel will keep being used for applying AI responses.)

---

## Feature Plan: Git Diff Review

**Goal:** Allow users to view uncommitted Git changes in the "Review" panel and revert them on a file-by-file basis.

**User Story:** As a developer, I want to see a list of all my uncommitted changes (modified, new, deleted files) within Athanor, so I can review the diffs and revert any unwanted changes directly in the app before making a commit.

### Phase 1: Rename "Apply Changes" to "Review"

Before adding new functionality, let's rename the existing components to reflect their new, more general purpose. This ensures the UI remains coherent.

1.  **Update the Tab Component (`src/components/AthanorTabs.tsx`)**
    - **Why:** This is the source of truth for the tab's name and its internal identifier.
    - **Action:**
      1.  In the `TabType` export, change `'apply-changes'` to `'review'`.
      2.  Find the `<button>` for the tab and change its text from "Apply Changes" to "Review". A more fitting icon, like `GitCompare`, would also be a good addition.
      3.  Update the `onClick` handler to call `onTabChange('review')`.

    <!-- end list -->

    ```typescript
    // src/components/AthanorTabs.tsx

    // 1. Change the type definition
    export type TabType = 'workbench' | 'viewer' | 'review' | 'settings' | 'cli';

    // ... inside the AthanorTabs component ...

    // 2. Find the button and update its text and handler call
    <button
      className={/*...*/}
      // 3. Update the onClick handler
      onClick={() => onTabChange('review')}
      data-test-id="review-tab-button" // Add a test ID for good measure
    >
      <GitCompare className="w-4 h-4 mr-2" /> {/* An icon like GitCompare is now more fitting */}
      Review
    </button>
    ```

2.  **Update References Throughout the App (Where Appropriate)**
    - **Why:** Several other components navigate to this tab programmatically. We need to update these references to prevent breaking existing functionality.
    - **Action:** Perform a project-wide search for the string `'apply-changes'` and replace it with `'review'`. Key files to check are:
      - `src/commands/applyChangesCommand.ts`: In `executeApplyChangesCommand`, update `setActiveTab('apply-changes')`.
      - `src/components/FileViewerPanel.tsx`: In the "Replace with Clipboard" handler, update `onTabChange('apply-changes')`.
      - `src/components/SendViaApiControls.tsx`: Update the `setActivePanelTab('apply-changes')` call.
    - **Important:** There is a `ath_command` (a special string used to denote Athanor instructions) called "apply changes". That should remain unchanged, as it correctly identifies the command.

### Phase 2: Extend the `GitService` (Backend)

Now, let's add the backend logic to get the diff information from Git. All Git operations happen in the main process for security and access to the command line.

1.  **Open `electron/services/GitService.ts`**
    - **Why:** This file is the single source of truth for all Git interactions. We'll add two new methods here.
    - **Action 1: Add `getUncommittedChanges()`**
      - This method will run `git diff --name-status HEAD` to find all files that have changed since the last commit.
      - It will parse the output to create a list of files with their status (M-modified, A-added, D-deleted).

    <!-- end list -->

    ```typescript
    // electron/services/GitService.ts

    // Add this interface to common/types/git-service.ts first
    export interface GitFileStatus {
      path: string;
      status: 'A' | 'M' | 'D'; // Added, Modified, Deleted
    }

    // Inside the GitService class
    async getUncommittedChanges(): Promise<GitFileStatus[]> {
      if (!(await this.isGitRepository())) {
        return [];
      }
      try {
        const output = await this.executeGitCommand('diff --name-status HEAD');
        if (!output.trim()) {
          return [];
        }
        return output
          .split('\n')
          .filter(line => line.trim())
          .map(line => {
            const [status, path] = line.split('\t');
            return { status: status.trim() as 'A' | 'M' | 'D', path: PathUtils.normalizeToUnix(path) };
          });
      } catch (error) {
        console.error('Error getting uncommitted changes:', error);
        return [];
      }
    }
    ```

    - **Action 2: Add `getContentAtHead()`**
      - This method will get the last committed version of a file's content.
      - It must handle the case where a file is new and doesn't exist in `HEAD`.

    <!-- end list -->

    ```typescript
    // electron/services/GitService.ts

    // Inside the GitService class
    async getContentAtHead(filePath: string): Promise<string> {
      if (!(await this.isGitRepository())) {
        return '';
      }
      try {
        // Use HEAD:./path to be explicit, helps with some git versions
        const platformPath = PathUtils.toPlatform(filePath);
        const output = await this.executeGitCommand(`show HEAD:"${platformPath}"`);
        return output;
      } catch (error) {
        // This is expected for newly added files. Return empty string.
        return '';
      }
    }
    ```

### Phase 3: Create the IPC Bridge

We need a secure way for the frontend (renderer) to ask the backend (main) for the Git diffs.

1.  **Create a New IPC Handler (`electron/handlers/gitHandlers.ts`)**
    - **Why:** It's good practice to keep handlers organized by function.
    - **Action:** Create a new file for Git-related IPC calls. This handler will orchestrate the calls to the `GitService` and `FileService`.

    <!-- end list -->

    ```typescript
    // electron/handlers/gitHandlers.ts
    import { ipcMain } from 'electron';
    import { GitService } from '../services/GitService';
    import { FileService } from '../services/FileService';

    export function setupGitHandlers(
      gitService: GitService,
      fileService: FileService
    ) {
      ipcMain.handle('git:view-diffs', async () => {
        const changedFiles = await gitService.getUncommittedChanges();
        const diffs = [];

        for (const file of changedFiles) {
          const oldCode = await gitService.getContentAtHead(file.path);
          let newCode = '';
          try {
            // New code is the current content on disk (unless deleted)
            if (file.status !== 'D') {
              newCode = (await fileService.read(file.path)) as string;
            }
          } catch (e) {
            // Could fail if file was deleted between git diff and read, which is fine
          }
          diffs.push({ ...file, oldCode, newCode });
        }
        return diffs;
      });
    }
    ```

    - Remember to call `setupGitHandlers(gitService, fileService)` inside `electron/ipcHandlers.ts` and pass in the service instances.

2.  **Expose the Handler in `electron/preload.ts`**
    - **Why:** The preload script defines the secure API (`window.electronBridge`) available to the frontend.
    - **Action:** Add a new `git` object to the `electronBridge`.

    <!-- end list -->

    ```typescript
    // electron/preload.ts

    // Inside contextBridge.exposeInMainWorld('electronBridge', { ... })
    git: {
      viewDiffs: () => ipcRenderer.invoke('git:view-diffs'),
    },
    ```

    - Update `src/types/global.d.ts` to include this new method on the `electronBridge` type so you get TypeScript autocompletion.

### Phase 4: Build the Frontend Experience

Now we'll add the button and wire it up to fetch and display the data.

1.  **Add the "View Diffs" Button (`src/components/MainLayout.tsx`)**
    - **Why:** We need a user-facing control to trigger the new feature. Placing it with other global actions in the file explorer header is logical.
    - **Action:** Add a new button and its handler.

    <!-- end list -->

    ```tsx
    // src/components/MainLayout.tsx

    // Import the store to set operations
    import { useApplyChangesStore } from '../stores/applyChangesStore';
    import { GitCompare } from 'lucide-react'; // Import a new icon
    import { useState } from 'react';

    const MainLayout: React.FC<MainLayoutProps> = ({...}) => {
      // Get the actions from the store
      const setOperations = useApplyChangesStore((state) => state.setOperations);
      const clearOperations = useApplyChangesStore((state) => state.clearOperations);
      // You will need a loading state
      const [isLoadingDiffs, setIsLoadingDiffs] = useState(false);

      const handleViewGitDiffs = async () => {
        setIsLoadingDiffs(true);
        try {
          // 1. Call the new IPC method
          const diffData = await window.electronBridge.git.viewDiffs();

          if (diffData.length === 0) {
            addLog('No uncommitted changes found.');
            setIsLoadingDiffs(false);
            return;
          }

          // 2. Transform the data into FileOperation objects
          const operations = diffData.map(diff => ({
            file_path: diff.path,
            file_operation: diff.status === 'A' ? 'CREATE' : diff.status === 'D' ? 'DELETE' : 'UPDATE_FULL',
            old_code: diff.oldCode,
            new_code: diff.newCode,
            file_message: `Uncommitted change detected. Status: ${diff.status === 'A' ? 'Added' : diff.status === 'D' ? 'Deleted' : 'Modified'}`,
            accepted: false,
            rejected: false,
          }));

          // 3. Populate the store
          clearOperations();
          setOperations(operations, 'git'); // Pass the new 'git' mode

          // 4. Switch to the Review tab
          onTabChange('review');

        } catch (error) {
          addLog(`Error fetching Git diffs: ${error.message}`);
        } finally {
          setIsLoadingDiffs(false);
        }
      };

      return (
        // ...
        // Add the button in the file explorer header, e.g., next to the Refresh button
        <button onClick={handleViewGitDiffs} disabled={isLoadingDiffs || !currentDirectory} title="View uncommitted changes">
            <GitCompare size={20} className={isLoadingDiffs ? 'animate-spin' : ''} />
        </button>
        // ...
      );
    };
    ```

### Phase 5: Implement the Revert Logic

This is the final step, where we make the "Reject" button functional for reverting changes.

1.  **Update the `applyChangesStore` (`src/stores/applyChangesStore.ts`)**
    - **Why:** The store controls the state and actions for the Review panel. We need to add the concept of a "mode" to distinguish between AI changes and Git changes.
    - **Action:**
      1.  Add `mode: 'ai' | 'git'` to the state.
      2.  Update `setOperations` to accept the mode.
      3.  Modify `rejectChange` to handle the logic for both modes.

    <!-- end list -->

    ```typescript
    // src/stores/applyChangesStore.ts

    interface ApplyChangesState {
      // ... existing state
      mode: 'ai' | 'git';
      setOperations: (ops: FileOperation[], mode?: 'ai' | 'git') => void;
      // ...
    }

    export const useApplyChangesStore = create<ApplyChangesState>(
      (set, get) => ({
        // ...
        mode: 'ai', // Default mode
        setOperations: (ops, mode = 'ai') => {
          set({ activeOperations: ops, mode });
        },

        rejectChange: async (index: number) => {
          const { activeOperations, mode } = get();
          const op = activeOperations[index];
          const { addLog } = useLogStore.getState();

          if (mode === 'git') {
            // GIT MODE: Revert the file
            try {
              if (op.file_operation === 'CREATE') {
                // Reverting a new file means deleting it
                await window.fileService.remove(op.file_path);
                addLog(`Reverted (deleted) new file: ${op.file_path}`);
              } else {
                // Reverting a modified or deleted file means writing the old content back
                await window.fileService.write(op.file_path, op.old_code);
                addLog(`Reverted changes to file: ${op.file_path}`);
              }
              // Mark as rejected in the UI
              const newOps = [...activeOperations];
              newOps[index] = { ...op, rejected: true };
              set({ activeOperations: newOps });
            } catch (error) {
              addLog(`Failed to revert ${op.file_path}: ${error.message}`);
            }
          } else {
            // AI MODE: Original logic
            const newOps = [...activeOperations];
            newOps[index] = { ...op, rejected: true };
            set({ activeOperations: newOps });
            addLog(`Rejected operation for file: ${op.file_path}`);
          }
        },
        // ...
      })
    );
    ```

    _Note: The original `rejectChange` was synchronous. Since it now performs file I/O, it should be made `async`._

2.  **Adjust the UI (`src/components/ApplyChangesPanel.tsx`)**
    - **Why:** The UI should reflect the current mode. For Git diffs, the "Accept" button is confusing and should be hidden or disabled.
    - **Action:** Read the `mode` from the store and conditionally render UI elements.

    <!-- end list -->

    ```tsx
    // src/components/ApplyChangesPanel.tsx

    const ApplyChangesPanel: React.FC = () => {
      const { mode } = useApplyChangesStore(); // Get mode

      // ...

      // Inside the FileOperationItem component's return statement:
      <div className="flex gap-2">
        {mode === 'ai' && ( // Only show Accept button in AI mode
          <button
            className="..."
            disabled={op.accepted || op.rejected}
            onClick={() => onAccept(index)}
          >
            Accept
          </button>
        )}
        <button
          className="..."
          disabled={op.accepted || op.rejected}
          onClick={() => onReject(index)}
        >
          {mode === 'git' ? 'Revert Change' : 'Reject'} {/* Change button text */}
        </button>
      </div>
    ```

### Phase 6: Verification

After implementing the changes, thoroughly test both the new and old workflows.

1.  **Git Diff Workflow:**
    - In a test project with a Git repository, modify a file, add a new file, and delete a file.
    - Click the "View Diffs" button. Do all three files appear in the "Review" panel with the correct status and diffs?
    - Click "Revert Change" on the modified file. Does the file revert to its previous content?
    - Click "Revert Change" on the new file. Is it deleted from the file system?
    - Click "Revert Change" on the deleted file. Is it restored with its original content?
    - Does the UI update correctly after reverting?

2.  **AI Change Workflow:**
    - Generate a prompt and get a response with an `<ath command="apply changes">` block.
    - Paste it into the workbench. Does it correctly populate the "Review" panel?
    - Does the "Accept" button appear and work correctly?
    - Does the "Reject" button work as it did before (i.e., just dismissing the suggestion)?

This detailed plan should guide you through the entire implementation process, resulting in a powerful and intuitive new feature for Athanor.
