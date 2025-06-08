# Design: Per-Task File Selection

**Date:** 2025-06-08
**Status:** Proposed
**Author:** Athanor AI Architect

## 1. Background

The current global file selection system in Athanor is inefficient for users managing multiple distinct tasks, as each task may require a different set of relevant files. Switching between tasks necessitates cumbersome re-selection of file groups.

Additionally, there is a need to maintain an explicit, ordered list for selected files. This ordering will enable future features, such as prioritizing which files to include in prompts with limited token contexts. The intended logic is that the most recently selected file should have the highest priority.

## 2. Goals

- The application's file selection state must be managed on a per-task-tab basis, with the state residing in `workbenchStore`.
- Each task tab's selection must be an ordered list, where newly selected files are added to the top.
- When a user switches task tabs, the file explorer UI (i.e., checkboxes) must update to reflect the selection of the newly active task tab.
- Creating a new task tab should initialize its file selection by inheriting the selection from the previously active task tab.

## 3. Non-Goals

- No specific non-goals were identified during this design phase. The implementation of the UI to display the selection is considered in scope.

## 4. Proposed Solution

### 4.1. State Management Refactoring

The primary source of truth for file selections will be moved from `fileSystemStore` to `workbenchStore`.

- The `TaskTab` interface (in `src/types/global.d.ts` and `src/stores/workbenchStore.ts`) will be updated to include a new property, such as `selectedFiles: string[]`, to store the ordered list of file paths (IDs).
- `fileSystemStore` will no longer hold the canonical selection state. Instead, its selection-related properties may be refactored to simply reflect the state of the _active_ tab in `workbenchStore`, ensuring compatibility for components that rely on it during the transition.

### 4.2. UI Implementation

A new UI component will be created and integrated into the `ActionPanel` (`src/components/ActionPanel.tsx`).

- **Placement:** This component will be located directly below the "Task context" input field to visually associate the file selection with the task context.
- **Functionality:**
  - It will display the count of currently selected files for the active tab (e.g., "**Selected Files: 5**").
  - The component will be clickable. On click, it will reveal a popover.
  - This menu will list the selected files in their correct priority order (most recent first).
  - The menu will include controls to remove individual files from the selection (e.g., an 'x' icon by each file) and a "Clear All" button to empty the selection for the current task.
  - File order can also be rearranged with drag and drop.

## 5. High-Level Plan / Stages

1.  **State Refactoring:** Update the data structures in `workbenchStore` and `global.d.ts` to accommodate the per-tab ordered list of selected files.
2.  **Logic & UI Decoupling:** Rework the `FileExplorer` components (`FileExplorer.tsx`, `FileExplorerItem.tsx`) to read selection state from, and dispatch selection changes to, the active `workbenchStore` tab.
3.  **Implement New UI:** Build the "Selected Files" display and popover component within the `ActionPanel` as specified in the solution.
4.  **Update Core App Logic:** Ensure that all related functionality—including tab creation, tab switching, and command handling (`selectCommand.ts`)—correctly interacts with the new per-tab selection state.
