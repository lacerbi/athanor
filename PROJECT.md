# Athanor - AI Code Nexus

## App Description

Athanor is an **Electron-based desktop application** that integrates AI coding assistants into a developer’s local workflow. Its primary goal is to streamline two main flows:

1.  **Prompt Creation & Refinement**

    - The user selects relevant files/folders within a dynamic file explorer.
    - Athanor then generates prompt text (optionally using multiple specialized “prompt templates” or “task templates”).
    - The user copies this prompt into an AI assistant (e.g., ChatGPT, Bard, Claude, etc.).
    - **Tooltips**: Throughout the application, contextual help is provided via tooltips that appear when hovering over buttons, controls, and interface elements. This is the primary method for providing short helper information without cluttering the UI.

2.  **Applying AI-Generated Changes**
    - The user copies the AI’s response from the assistant back into the clipboard.
    - Athanor parses custom XML-like commands (e.g., `<ath command="apply changes">...`) to figure out how to create, modify, or delete specific files.
    - The user can preview diffs, accept or reject each change, and finalize changes to disk.

### Key Features

1.  **Dynamic File Explorer**

    - Displays a tree of the chosen project directory.
    - Tracks file line counts (for text files) and uses `.athignore` rules to hide excluded paths.
    - Allows multi-select of files and folders; selecting a folder auto-selects its descendants unless hidden.
    - Automatically updates when files are added or removed on disk (Chokidar watchers).

2.  **Ignore Rules Management**

    - `.athignore` is the primary ignore file used within Athanor.
    - Rules can be seeded from `.gitignore` during initial setup, ensuring minimal duplication.
    - The main process (via `ignoreRulesManager.ts`) uses the `ignore` library to handle advanced wildcard matching, including an 'ignore all by name' option available via the file explorer's context menu.

3.  **Task & Prompt Management**

    - Multiple “task tabs,” managed by `workbenchStore.ts`, each containing:
      - A **task description**: plain-text or markdown instructions.
      - An **AI output** area: displays the generated prompt for the user to copy.
      - A **context** field: for ephemeral data (like partial commit messages or specific instructions); includes context suggestions based on task content (`contextDetection.ts`).
    - Prompt (`prompt_*.xml`) and Task (`task_*.xml`) templates live in `resources/prompts/` and are loaded on application startup via `promptService.ts`.
    - The user can dynamically switch between prompt/task _variants_ (e.g., different modes like “Query,” “Coder,” “Architect” or task variations like “Default”, “LaTeX”) using context menus in the Action Panel (`PromptContextMenu.tsx`, `TaskContextMenu.tsx`).

4.  **Clipboard & Code Changes**

    - Code blocks or raw text can be copied with consistent line endings and optional code fences.
    - The “apply changes” flow scans for XML blocks from the AI’s output, extracts file operations, and shows them in a diff panel.

5.  **Project Setup & Supplementary Materials**

    - On folder selection, Athanor can create a `.athignore` file if it does not exist.
    - A hidden `.ath_materials` folder is automatically created to store extra references (like doc fragments).
    - If `.gitignore` exists, its rules can be merged in as an optional step.

6.  **User Interface Layout**

    - **Left Panel**: The file explorer with watchers, expansions, checkboxes, and a context menu (right-click to ignore items).
    - **Right Panel**: Tabs for different tasks, a file viewer, and the “Apply Changes” panel that lists AI-proposed modifications. Action Panel controls prompt generation, preset tasks, and configuration toggles (Smart Preview, Include File Tree, Documentation Format).
    - A bottom **log panel** shows messages and clickable events for debugging or re-inspection (`logStore.ts`).

7.  **Preset Tasks**

    - Pre-defined tasks (e.g., 'AI Summary', 'Refactor Code') available in the Action Panel, loaded from `task_*.xml` files.

8.  **Drag and Drop**
    - File paths can be dragged from the file explorer and dropped into the Task Description or Context text areas (`useFileDrop.ts`).

## Tech Stack

### Core Architecture

Athanor follows Electron's recommended **“secure by default”** pattern, separating logic between **main** and **renderer** processes:

1.  **Main Process (Electron)**

    - **`main.ts`**: Application startup, window creation, and core event handling.
    - **IPC Handlers**:
      - `ipcHandlers.ts` collects all handlers from `handlers/` (e.g., `coreHandlers.ts`, `fileOperationHandlers.ts`, `fileWatchHandlers.ts`) into a single registration function.
      - Each handler uses Node's `fs/promises` and Chokidar watchers while ensuring paths are sanitized (`filePathManager.ts`).
    - **File System Manager** (`fileSystemManager.ts`):
      - Maintains a global “base directory” to represent the open project folder.
      - Performs file reads/writes, folder creation, ignoring logic, and error handling.
      - Cleans up watchers on application exit or directory change.
      - Delegates path operations to `filePathManager.ts`.
    - **Ignore Rules Manager** (`ignoreRulesManager.ts`):
      - Loads `.athignore` for file exclusion.
      - Provides advanced matching logic using the `ignore` npm library.
    - **FilePath Manager** (`filePathManager.ts`):
      - Centralizes all path normalization (Unix-style internally), conversion, and manipulation logic.

2.  **Renderer Process (React)**
    - **`src/services/fileSystemService.ts`**:
      - High-level logic for building a file tree from data returned via IPC.
      - Normalizes line endings and counts file lines for text files.
      - Applies ignoring rules or merges them into the UI structure.
    - **React Components** (`src/components/*`):
      - **`AthanorApp.tsx`** and **`MainLayout.tsx`** define the overall UI layout:
        - File explorer on the left (expanded by `FileExplorer.tsx`).
        - Action tabs (workbench, viewer, apply-changes) on the right.
      - `ApplyChangesPanel.tsx` is the UI for viewing & applying AI-proposed code modifications.
      - `FileContextMenu.tsx` handles ignoring items and possibly other file actions from the explorer.
      - `ActionPanel.tsx` controls prompt generation and preset tasks, hooking into `promptStore.ts`, `workbenchStore.ts`, and `taskStore.ts`.
    - **Global Stores** (Zustand) in `src/stores/*`:
      - `fileSystemStore.ts`: Tracks selected files/folders, previews, and tree data.
      - `promptStore.ts`: Manages loaded prompt definitions & active prompt variants.
      - `workbenchStore.ts`: Maintains multiple “task tabs” used to hold user tasks & AI outputs.
      - `applyChangesStore.ts`: Handles the ephemeral list of file changes returned by AI, letting the user apply or reject them.
      - `taskStore.ts`: Manages loaded task definitions & active task variants.
    - **Utilities** (`src/utils/*`):
      - `fileTree.ts`: Functions for sorting & iterating nested file structures.
      - `constants.ts`: Shared config (e.g., thresholds for large files).
      - `extractTagContent.ts`: Helpers for parsing XML segments.
      - Others (e.g., `buildPrompt.ts`, `tokenCount.ts` (using `js-tiktoken`)) serve specialized tasks like AI prompt assembly or token counting.

### Technology Stack

- **Electron v33+**: Powers the main/renderer separation. The main process is responsible for file system access, watchers, and launching the application. The renderer hosts the React UI.
- **React 18+**: Renders the front-end UI, including file explorer trees, task/prompt panels, and the changes diff viewer.
- **TypeScript 5+**: Provides strict typing across main and renderer processes.
- **Node.js** (latest LTS): Provides the backend runtime for the main process.
- **Zustand**: Maintains local state in separate stores—e.g., file selection state (`fileSystemStore.ts`), prompt management (`promptStore.ts`), multi-tab workbench (`workbenchStore.ts`), task management (`taskStore.ts`), etc.
- **Chokidar**: Watches the local file system for changes in the open folder.
- **ignore**: Reads `.athignore` and `.gitignore` to filter out hidden or excluded files in the Explorer.
- **js-tiktoken**: Used for accurate token counting in prompts.
- **Webpack & electron-forge**: Build, package, and run the Electron application.
- **TailwindCSS 3 + Lucide Icons**: Provides a flexible styling system and icon library for a clean UI.
- **Material-UI (MUI) 5**: Partially integrated for certain UI elements (used in some components).
- **ESLint / Prettier**: Linting & formatting for consistent code style.

### Future Considerations

- **Testing**: Integrate unit tests for the main process (handlers) and React components.
- **Database or Extended Persistence**: If user data or historical tasks become more complex, a storage layer might be beneficial.
- **Refined Prompt Templates**: Additional dynamic placeholders or user-defined placeholders.
- **Advanced Visual Diffs**: Implement more advanced color-coded diffs for large or complex changes.
- **Security**: Further refine path sanitization and sandboxing, especially if running untrusted AI output.

### Action Points

1.  When working with direct file system operations:

    - Use `fileSystemManager.ts` functions in main process code.
    - Access through IPC handlers defined in `handlers/` directory.
    - Handle errors appropriately at each layer.

2.  When building UI features:

    - Use `fileSystemService.ts` for file tree operations in the renderer.
    - Access through React hooks and components.
    - Handle loading states and error conditions.

3.  For new file system features:

    - Add core functionality to `fileSystemManager.ts` or `filePathManager.ts` as appropriate.
    - Create corresponding IPC handlers in `handlers/`.
    - Add interface methods to `preload.ts`.
    - Implement high-level operations in `fileSystemService.ts` if needed for the UI.

4.  TypeScript & Global Types:

    - Regularly open and double-check **`src/types/global.d.ts`** to avoid TypeScript mistakes.
    - This file extends the `window` interface to expose `window.fileSystem`, houses core global interfaces (like `FileOperation`), and organizes key application-level types.
    - If an IPC method signature changes in the main process or `preload.ts`, update both the main code **and** `global.d.ts` accordingly.

5.  When debugging:

    - Check main process logs for `fileSystemManager.ts` or `filePathManager.ts` issues.
    - Verify IPC communication through preload bridge.
    - Inspect renderer process state using React DevTools, focusing on Zustand stores and `fileSystemService.ts` usage.

6.  Security considerations:
    - Never bypass the IPC bridge for file operations from the renderer process.
    - Validate all paths and operations rigorously in the main process handlers.
    - Handle sensitive data appropriately at each layer.
